/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * This service provides methods to manage result transformations and transformed results.
 *
 * @version 1.3
 * @author albertwang, j3_guile, Sky_
 *
 * changes in 1.1:
 * 1. Set url property when creating the TransformedResult.
 * 2. Set errorMessage property if import failed.
 * 
 * changes in 1.2:
 * 1. Implement mapReduce mapping for TransformResult collection (fast searching and sorting)
 * 2. Implement next/prev feature for transformationResult
 * 3. change lastTimeCheck logic in getCompletedWorkUnits and use WorkUnit.isTransformed flag
 *
 * Changes in 1.3:
 * - Updated the configuration file path.
 */
/*global beforeEach, it, describe, afterEach, mapReduceElement, emit */
"use strict";
var SERVICE = 'ResultTransformationService';

var _ = require('underscore');
var async = require('async');
var localeval = require('localeval');
var libxmljs = require("libxmljs");
var config = require('../../config');
var winston = require('winston');
var mongoose = config.getIntegrationManagerMongoose();
var TransformedResult = mongoose.model('TransformedResult', require('../models/TransformedResult').TransformedResultSchema);
var TransformedResultField = mongoose.model('TransformedResultField', require('../models/TransformedResultField').TransformedResultFieldSchema);
var WorkflowIntegrationConfiguration = mongoose.model('WorkflowIntegrationConfiguration', require('../models/WorkflowIntegrationConfiguration').WorkflowIntegrationConfigurationSchema);
var workflowManagerMongoose = config.getWorkflowManagerMongoose();
var WorkUnit = workflowManagerMongoose.model('WorkUnit', require('../models/workflow_manager/WorkUnit').WorkUnitSchema);
var Client = workflowManagerMongoose.model('Client', require('../models/workflow_manager/Client').ClientSchema);
var TransformedResultDef = require('../models/TransformedResult_mapreduce');
var TransformedResultMapReduce = mongoose.model('TransformedResultMapReduce', TransformedResultDef.TransformedResultMapReduceSchema, TransformedResultDef.tableName);

var delegates = require('../helpers/DelegateFactory');
var validator = require("../helpers/validator");


/**
 * Update item in mapReduce collection.
 * This should be called each time after TransformedResult is created or updated.
 * @param {String} id the transformation result id
 * @param {Function} callback the callback function
 * @private
 * @since 1.2
 */
function updateMapReduceItem(id, callback) {
    TransformedResult.mapReduce({
        map: mapReduceElement,
        query: {_id: id},
        out: { merge: TransformedResultDef.tableName }
    }, function (err) {
        callback(err);
    });
}

/**
 * Get completed work units since last check.
 *
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) workUnits - completed work units from the last time it was checked
 */
function getCompletedWorkUnits(callback) {
    var sig = 'ResultTransformationService#getCompletedWorkUnits';

    WorkUnit.find({
        isDone: true,
        isTransformed: { $ne: true }
    }).select("client resultXML workflowId url fileName startTime").exec(function (err, workUnits) {
        if (err) {
            return callback(err);
        }
        //populate client only once
        Client.find({}, function (err, clients) {
            var id2Client = {};
            _.each(clients, function (client) {
                client = client.toJSON();
                client.id = String(client._id);
                id2Client[client.id] = client;
                client.workflows = _.map(client.workflows, function (w) {
                    w.id = w._id;
                    return w;
                });
            });
            workUnits = _.map(workUnits, function (unit) {
                unit = unit.toJSON();
                unit.id = unit._id;
                unit.constructor.modelName = "WorkUnit";
                unit.client = id2Client[unit.client];
                unit.workflow = _.findWhere(unit.client.workflows, function (workflow) {
                    return workflow.id === unit.workflowId;
                });
                unit.workflow.id = unit.workflow._id;
                return unit;
            });
            winston.info('%s - Found %d completed WorkUnits', sig, workUnits.length);
            callback(err, workUnits);
        });
    });
}

/**
 * Set work unit as transformed
 * @param {String} workUnitId the work unit id
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 * @since 1.2
 */
function setTransformed(workUnitId, callback) {
    WorkUnit.findByIdAndUpdate(workUnitId, {isTransformed: true}, function (err) {
        callback(err);
    });
}

/**
 * Extract fields from the xml results of a work unit.
 *
 * @param {WorkUnit} workUnit the WorkUnit to extract results from
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the extracted results from the xml
 */
function extractResult(workUnit, callback) {
    var error = validator.validateType('workUnit', workUnit, 'WorkUnit');
    if (error) {
        winston.error('Error with extractResults: ', error);
        return callback(error);
    }

    var xmlDoc;
    // Parse XML
    try {
        xmlDoc = libxmljs.parseXmlString(workUnit.resultXML);
    } catch (e) {
        delegates.getLog().error('Bad XML', workUnit.resultXML);
        return callback({status: 500, message: 'Unable to parse workUnit result'});
    }

    var fields = [];
    _.each(xmlDoc.find("//Field"), function (element) {
        var jobName = element.attr('jobname');
        var confidence = element.attr('confidence');
        var value = element.attr('value');
        if (value) {
            fields.push(new TransformedResultField({
                name: element.attr('name').value(),
                value: value.value(),
                jobName: jobName ? jobName.value() : undefined,
                confidence: confidence ? confidence.value() : undefined
            }));
        }
    });
    // Add additional WorkUnit fields to TransformationResult
    fields.push(new TransformedResultField({
        name: 'workUnitId',
        value: workUnit.id
    }));
    fields.push(new TransformedResultField({
        name: 'fileName',
        value: workUnit.fileName
    }));
    fields.push(new TransformedResultField({
        name: 'workflowName',
        value: workUnit.workflow.name
    }));
    // Create TransformedResult record
    new TransformedResult({
        clientId: workUnit.client.id,
        clientName: workUnit.client.name,
        workUnitId: workUnit.id,
        workflowId: workUnit.workflowId,
        url: workUnit.url,
        status: 'pending',
        fields: fields,
        reviewStatus: 'Not Reviewed',
        assignedStatus: 'Not Assigned',
        notes: '',
        workUnitStartTime: workUnit.startTime
    }).save(function (err, result) {
        if (err) {
            return callback(err);
        }
        updateMapReduceItem(result.id, function (err) {
            callback(err, result);
        });
    });
}

/**
 * Retrieves the associated configuration for the given transformation result.
 * @param {TransformedResult} transformedResult the transformation result
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) workflowIntegrationConfiguration - the associated configuration
 * @private
 */
function _getWorkflowIntegrationConfiguration(transformedResult, callback) {
    var error = validator.validateType('transformedResult', transformedResult, 'TransformedResult');
    if (error) {
        return callback(error);
    }

    WorkflowIntegrationConfiguration.findOne({ workflowId: transformedResult.workflowId }, function (err, wic) {
        if (err) {
            return callback(err);
        }

        if (!wic) {
            return callback({status: 404, message: 'WorkflowIntegrationConfiguration not found for ' + transformedResult.workflowId});
        }

        callback(err, wic);
    });
}

/**
 * Save transformed result.
 * @param {TransformedResult} transformedResult the result object to process
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the saved transformation result
 */
function saveTransformedResult(transformedResult, callback) {
    var error = validator.validateType('transformedResult', transformedResult, 'TransformedResult');
    if (error) {
        return callback(error);
    }
    var saveResult;
    async.waterfall([
        function (cb) {
            transformedResult.save(cb);
        }, function (result, count, cb) {
            saveResult = result;
            updateMapReduceItem(result.id, cb);
        }
    ], function (err) {
        callback(err, saveResult);
    });
}

/**
 * Executes the transformation rules for the given results.
 * @param {TransformedResult} transformedResult the result object to process
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the updated transformation result
 */
function transformResult(transformedResult, callback) {
    async.waterfall([
        // Find WorkflowIntegrationConfiguration
        function (cb) {
            _getWorkflowIntegrationConfiguration(transformedResult, cb);
        },
        // Execute transformation rules
        function (wic, cb) {
            var context = {};
            context.$add = {};
            context.$set = {};
            _.each(transformedResult.fields, function (field) {
                context[field.name] = field.value;
            });
            _.each(wic.transformationRules, function (transformationRule) {
                try {
                    localeval(transformationRule.rule, context);
                } catch (e) {
                    console.log('Error with transformationRule: ' + transformationRule.rule);
                    return callback(e);
                }
                _.each(context.$add, function (value, name) {
                    if (value) {
                        transformedResult.fields.push({
                            name: name,
                            value: value
                        });
                    }
                    context[name] = value;
                });

                var name2Field = {};
                _.each(transformedResult.fields, function (field) {
                    name2Field[field.name] = field;
                });

                _.each(context.$set, function (value, name) {
                    if (value) {
                        if (name2Field[name]) {
                            name2Field[name].value = value;
                        } else {
                            var field = {name: name, value: value};
                            transformedResult.fields.push(field);
                            name2Field[name] = field;
                        }
                    }
                    context[name] = value;
                });

                // reset before executing the next rule
                context.$add = {};
                context.$set = {};
            });

            cb(null, transformedResult);
        },
        saveTransformedResult
    ], callback);
}

/**
 * Executes the mapping rules for the given results.
 * @param {TransformedResult} transformedResult the result object to process
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the updated transformation result
 */
function mapResult(transformedResult, callback) {
    async.waterfall([
        // Find WorkflowIntegrationConfiguration
        function (cb) {
            _getWorkflowIntegrationConfiguration(transformedResult, cb);
        },
        // Execute mapping rules
        function (wic, cb) {
            _.each(wic.mappingRules, function (mappingRule) {
                _.each(transformedResult.fields, function (f) {
                    if (f.name === mappingRule.fieldName && f.value === mappingRule.value) {
                        f.value = mappingRule.mappedValue;
                    }
                });
            });
            cb(null, transformedResult);
        },
        saveTransformedResult
    ], callback);
}

/**
 * Search for transformed results.
 * @param {Object} filter mongodb filter to be applied
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResults - the matching objects
 */
function filterTransformedResults(filter, callback) {
    TransformedResult.find(filter, callback);
}

/**
 * Get specific transformed results.
 * @param {String} id transformed result id
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the matching object
 */
function getTransformedResult(id, callback) {
    var error = validator.validateObjectId('id', id);
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            TransformedResult.findById(id).exec(function (err, item) {
                if (item && item !== undefined) {
                    cb(null, item);
                } else {
                    cb(err || { status: 404, message: 'Cannot find the result.'});
                }
            });
        }, function (item, cb) {
            _getWorkflowIntegrationConfiguration(item, function (err, wic) {
                cb(null, wic, item);
            });
        },
        function (wic, item, cb) {
            var fields = [];
            var i, j, k;
            var regexString, regex;
            var found;
            if (wic === undefined) {
                item.fields = fields;
                return cb(null, item);
            }
            if (item.fields !== undefined && item.fields !== null) {
                if (wic.mappingRules.length > 0) {
                    for (i = 0; i < item.fields.length; i++) {
                        for (j = 0; j < wic.mappingRules.length; j++) {
                            if (item.fields[i].name === wic.mappingRules[j].fieldName) {
                                fields.push(item.fields[i]);
                                break;
                            }
                        }
                    }
                }
                if (wic.transformationRules.length > 0) {
                    for (i = 0; i < item.fields.length; i++) {
                        for (j = 0; j < wic.transformationRules.length; j++) {
                            regexString = '\\$add.' + item.fields[i].name + '|\\$set.' + item.fields[i].name;
                            regex = new RegExp(regexString);
                            if (wic.transformationRules[j].rule.search(regex) !== -1) {
                                found = false;
                                for (k = 0; k < fields.length; k++) {
                                    if (item.fields[i].name === fields[k].name) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    fields.push(item.fields[i]);
                                }
                                break;
                            }
                        }
                    }
                }
            }
            item.fields = fields;
            cb(null, item);
        }
    ], callback);
}

/**
 * Get all transformed results.
 *
 * @param {String} results with a specific status (optional field)
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResults - the matching objects
 */
function getTransformedResults(status, callback) {
    if (!status) {
        TransformedResult.find({}, callback);
    } else {
        TransformedResult.find({
            status: status
        }).limit(100).exec(callback);
    }
}

/**
 * Updates the status of the transformed results.
 * @param {String} clientId the caller's client ID
 * @param {Array} statuses an array of status objects containing the update information
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) notUpdatedStatuses - array of status objects that were not processed completely
 */
function updateTransformedResultsImportStatus(clientId, statuses, callback) {
    // Represents the TransformedResultImportStatus records which are not properly handled by the Integration Manager
    // i.e. some error occurred while handling these TransformedResultImportStatus records
    var notUpdatedStatuses = [];

    async.each(statuses, function (status, cb) {
        async.waterfall([
            // Get result
            function (cb) {
                getTransformedResult(status.id, cb);
            },
            // Update result status
            function (transformedResult, cb) {
                if (transformedResult && transformedResult.clientId === clientId) {
                    if (status.succeeded === true) {
                        transformedResult.status = 'import_succeeded';
                        //clear the error message
                        transformedResult.errorMessage = "";
                    } else {
                        transformedResult.status = 'import_failed';
                        transformedResult.errorMessage = status.message;
                        _.each(status.failedFields, function (ff) {
                            var field = _.find(transformedResult.fields, function (f) {
                                return f.name === ff.name;
                            });
                            if (field) {
                                field.importFailed = true;
                                field.errorMessage = ff.errorMessage;
                            }
                        });
                    }

                    //Set the time when the status was changed
                    transformedResult.lastImportTime = Date.now();

                    saveTransformedResult(transformedResult, cb);
                } else {
                    cb({status: 403, message: "The client does not have permission to access the result."});
                }
            }
        ], function (err) {
            if (err) {
                delegates.getLog().error('Updating transformation status failed.', err);
                notUpdatedStatuses.push(status);
            }
            // Not pass error to async.each callback so that one error does not break the entire process
            cb();
        });
    }, function (err) {
        callback(err, notUpdatedStatuses);
    });
}

/**
 * Delete all transformed result by workUnitId
 *
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function deleteTransformedResultsByWorkUnit(workUnitId, callback) {
    TransformedResult.findOneAndRemove({workUnitId: workUnitId}, function (err, result) {
        if (err) {
            return callback(err);
        }
        if (!result) {
            return callback();
        }
        TransformedResultMapReduce.findByIdAndRemove(result.id, function (err) {
            callback(err);
        });
    });
}

/**
 * This is a function used as `map` in mapReduce operation.
 * It's used internally by mongodb. `this` and `emit` are set by mongodb.
 * It shouldn't use any external libraries or functions.
 * Output represents same object used in angular page
 */
function mapReduceElement() {
    /*jshint validthis:true*/
    /* global emit */
    var fields = this.fields;
    var documentType = "";
    var accounts = [];
    var state = "";
    var jurisdiction = "";
    var dueData = "";
    var taxPayerName = "";
    var propertyType = "";
    var documentDate, j, docname, k, field, docday, docmonth;

    for (j = 0; j < fields.length; j++) {
        field = fields[j];
        if (field.name === "DocumentName") {

            docname = field.value;
            docname = docname.split("_");

            for (k = 2; k < docname.length; k++) {

                if (/20\d\d/.test(docname[k].substring(0, 4))) { //match any 20XX year
                    docday = docname[k - 1];
                    docmonth = docname[k - 2];
                    documentDate = new Date(docname[k].substring(0, 4), docmonth - 1, docday);
                }

            }
        }
        if (field.name === "DocumentType") {
            documentType = field.value;
        }
        if (field.name === "accounts") {
            accounts.push(field.value);
        }
        if (field.name === "State") {
            state = field.value;
        }
        if (field.name === "TaxPayerName") {
            taxPayerName = field.value;
        }
        if (field.name === "PropertyType") {
            propertyType = field.value;
        }
        if (field.name === "AssessorName" || field.name === "CollectorName") {
            jurisdiction = field.value;
        }
        if (field.name === "GrossAmountDueDate" || field.name === "ReturnDueDate" || field.name === "AppealDueDate") {
            dueData = new Date(field.value);
        }

    }

    var emptyString = "";
    var data = {
        clientId: this.clientId,
        status: this.status,
        documentType: documentType,
        accounts: accounts + emptyString,
        state: state,
        jurisdiction: jurisdiction,
        dueData: dueData,
        taxPayerName: taxPayerName,
        propertyType: propertyType,
        reviewStatus: this.reviewStatus,
        assignedStatus: this.assignedStatus,
        notes: this.notes,
        documentDate: documentDate,
        errorMessage: this.errorMessage,
        workUnitStartTime: this.workUnitStartTime
    };
    emit(this._id, data);
}


/**
 * Search transformed results using mapreduce collection for fast searching
 * @param {Object} searchCriteria the search criteria
 * @param {Object} sortCriteria the sorting conditions
 * @param {Number} offset the offset
 * @param {Number} limit the limit
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) result - the search result (object with `items` and `total` properties)
 * @since 1.2
 */
function searchTransformedResults(searchCriteria, sortCriteria, offset, limit, callback) {
    var items = [], total, order = [];
    sortCriteria._id = 1;
    async.waterfall([
        function (cb) {
            async.parallel({
                total: function (cb) {
                    TransformedResultMapReduce.count(searchCriteria, cb);
                },
                items: function (cb) {
                    TransformedResultMapReduce
                        .find(searchCriteria)
                        .sort(sortCriteria)
                        .skip(offset)
                        .limit(limit)
                        .exec(cb);
                }
            }, cb);
        }, function (result, cb) {
            total = result.total;
            var idx = 0;
            //remember original order
            _.each(result.items, function (item) {
                order[item.id] = idx++;
            });
            TransformedResult.find({_id: {$in: _.pluck(result.items, "_id")}}, cb);
        }, function (result, cb) {
            //restore original order
            _.each(result, function (item) {
                items[order[item.id]] = item;
            });
            cb(null, {
                total: total,
                items: items
            });
        }
    ], callback);
}



/**
 * Get previous and next elements using search and sort criteria.
 * 
 * @param {String} id the id of existing element
 * @param {Object} searchCriteria the search criteria
 * @param {Object} sortCriteria the sort criteria
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) prev - the id of previous element
 *    3) next - the id of next element
 * @since 1.2
 */
function getPrevAndNextTransformationElements(id, searchCriteria, sortCriteria, callback) {
    var existing;
    sortCriteria._id = 1;
    async.waterfall([
        function (cb) {
            TransformedResultMapReduce.findById(id, cb);
        }, function (result, cb) {
            existing = result;
            if (!existing) {
                return cb(new Error("Element not found: " + id));
            }
            var allCriteria = [];
            var exactCriteria = {};
            //find index of existing element in unsorted collection
            //we create criteria to compute count of elements that are before of existing element
            //for example if sorting is: taxPayerName, -state
            //criteria is
            //[
            //  { 'value.taxPayerName': { '$lt': `existing.taxPayerName` } },
            //  { 'value.taxPayerName': `existing.taxPayerName`, 'value.state': { '$gt': `existing.state` } },
            //  { 'value.taxPayerName': `existing.taxPayerName`, 'value.state': `existing.state`, _id: { '$lt': `existing.id`  } } 
            //]

            _.each(sortCriteria, function (order, name) {
                var path = name.split(".");
                var value;
                if (path.length === 2) {
                    value = existing[path[0]][path[1]];
                } else {
                    value = existing[name];
                }
                var singleCriteria = {};
                if (order === -1) {
                    singleCriteria[name] = {$gt : value};
                } else {
                    singleCriteria[name] = {$lt : value};
                }
                allCriteria.push(_.extend({}, exactCriteria, singleCriteria));
                exactCriteria[name] = value;
            });
            TransformedResultMapReduce.count({
                $and: [
                    searchCriteria,
                    {
                        $or: allCriteria
                    }
                ]
            }, cb);
        }, function (index, cb) {
            async.parallel({
                prev: function (cb) {
                    if (index < 1) {
                        return cb(null, []);
                    }
                    TransformedResultMapReduce
                        .find(searchCriteria)
                        .sort(sortCriteria)
                        .skip(index - 1)
                        .limit(1)
                        .exec(cb);
                },
                next: function (cb) {
                    TransformedResultMapReduce
                        .find(searchCriteria)
                        .sort(sortCriteria)
                        .skip(index + 1)
                        .limit(1)
                        .exec(cb);
                }
            }, cb);
        }, function (result, cb) {
            var prev, next;
            if (result.prev.length) {
                prev = result.prev[0].id;
            }
            if (result.next.length) {
                next = result.next[0].id;
            }
            cb(null, prev, next);
        }
    ], callback);
}


module.exports = {
    getCompletedWorkUnits: delegates.service(SERVICE, getCompletedWorkUnits, {input: [], output: ["workUnits"]}),
    extractResult: delegates.service(SERVICE, extractResult, {input: ["workUnit"], output: ["transformedResult"]}),
    transformResult: delegates.service(SERVICE, transformResult, {input: ["transformedResult"], output: ["transformedResult"]}),
    mapResult: delegates.service(SERVICE, mapResult, {input: ["transformedResult"], output: ["transformedResult"]}),
    saveTransformedResult: delegates.service(SERVICE, saveTransformedResult, {input: ["transformedResult"], output: ["transformedResult"]}),
    filterTransformedResults: delegates.service(SERVICE, filterTransformedResults, {input: ["filter"], output: ["transformedResults"]}),
    getTransformedResult: delegates.service(SERVICE, getTransformedResult, {input: ["id"], output: ["transformedResult"]}),
    getTransformedResults: delegates.service(SERVICE, getTransformedResults, {input: ["status"], output: ["transformedResults"]}),
    updateTransformedResultsImportStatus: delegates.service(SERVICE, updateTransformedResultsImportStatus, {input: ["clientId", "statuses"], output: ["notUpdatedStatuses"]}),
    deleteTransformedResultsByWorkUnit: delegates.service(SERVICE, deleteTransformedResultsByWorkUnit, {input: ["workUnitId"], output: []}),
    mapReduceElement: mapReduceElement,
    searchTransformedResults: delegates.service(SERVICE, searchTransformedResults, {input: ["searchCriteria", "sortCriteria", "offset", "limit"], output: ["result"]}),
    getPrevAndNextTransformationElements: delegates.service(SERVICE, getPrevAndNextTransformationElements, {input: ["id", "searchCriteria", "sortCriteria"], output: ["prev", "next"]}),
    updateMapReduceItem: delegates.service(SERVICE, updateMapReduceItem, {input: ["id"], output: []}),
    setTransformed: delegates.service(SERVICE, setTransformed, {input: ["workUnitId"], output: []})
};
