/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This service provides methods to manage and execute workflow.
 *
 * @version 1.10
 * @author albertwang, Sky_, mln
 *
 * changes in 1.1:
 * 1. Single task has also entryCondition.
 * 2. Add jobname to output xml for each field.
 * 3. Transform the result from cf unit, if task specifies transformation rules.
 * 4. Each work unit contains taskGroup in inner schema. It allows multiple task configurations.
 *
 * changes in 1.2:
 * 1. add replaceTaskGroups
 *
 * changes in 1.3:
 * 1. Add support for multiple clients and workflows.
 * 2. Recreate document if not found in _setDocumentReady.
 * 3. Return only valid work units in getWorkUnits (client and workflow must exist).
 * 4. Add to output xml clientId and clientName.
 * 5. Add methods: _logJobLink, _applyReviewOrEscalationResult, getClients, updateWorkflow.
 * 6. Add new phases Review and Escalation.
 * 7. Add STATS property to context in _verifyTaskGroupEntryCondition.
 * 8. Remove methods: createTaskGroup, getTaskGroups, replaceTaskGroups, deleteTaskGroup.
 *
 * changes in 1.4:
 * 1. Change transformation logic.
 *
 * changes in 1.5:
 * 1. Add start and end times to tasks and work units.
 * 2. Capture costs per work unit.
 *
 * changes in 1.6:
 * 1. Fix memory leak in _verifyTaskGroupEntryCondition. global.gc() must be called manually.
 *
 * changes in 1.7:
 * 1. Updated processWorkUnits and fetchWorkUnitResults to query DB in pages.
 * 2. Removed need to use global.gc() manually.
 * 
 * changes in 1.8:
 * 1. Fix issue on duplicated taxonomies. Create queued version of _verifyNewDocument method.
 *
 * changes in 1.9:
 * 1. Fix parallel update in _setDocumentReady (set taxonomyResults using atomic query)
 *
 * Changes in 1.10:
 * - Updated the configuration file path.
 */
"use strict";

var config = require('../../config');
var CONST = require('../config/constants');
var _ = require('underscore');
var util = require('util');
var async = require('async');
var mongoose = config.getMongoose();
var WorkUnit = mongoose.model('WorkUnit', require('../models/WorkUnit').WorkUnitSchema);
var Client = mongoose.model('Client', require('../models/Client').ClientSchema);
var Document = mongoose.model('Document', require('../models/Document').DocumentSchema);
var WorkUnitProcessingPhase = require("../models/WorkUnitProcessingPhase");
var XMLWriter = require('xml-writer');
var winston = require('winston');
var crowdFlowerService = require("./CrowdFlowerService");
var boxService = require("./BoxService");
var logging = require("../helpers/logging");
var validator = require("../helpers/validator");

var PARALLEL_LIMIT = config.PARALLEL_LIMIT;

var localeval;
if (process.env.NOT_SAFE_EVAL) {
    localeval = require("../helpers/localevalNotSafe");
    winston.warn("Using not safe eval function");
} else {
    localeval = require('localeval');
}

//async.queue for _verifyNewDocument
var verifyDocumentQueue;

/**
 * Get work units from database.
 * Only result that have valid client and workflow will be returned.
 * @param {Object} filter used to filter work units
 * @param {Function<err, unitWorks>} callback the callback function
 */
function getWorkUnits(filter, callback) {
    var error = validator.validate({filter: filter}, {filter: "anyObject"});
    if (error) {
        callback(error);
        return;
    }
    var offset = filter.offset;
    var limit = filter.limit;
    delete filter.offset;
    delete filter.limit;
    var query = WorkUnit.find(filter);
    if (_.isNumber(offset)) {
        query = query.skip(offset);
    }
    if (_.isNumber(limit)) {
        query = query.limit(limit);
    }
    query.populate("client").exec(function (err, units) {
        if (err) {
            callback(err);
            return;
        }
        var ret = [];
        _.each(units, function (unit) {
            if (!unit.client) {
                winston.error("Client not found for unit: " + unit.id);
                return;
            }
            if (!unit.workflow) {
                winston.error("Workflow not found for unit: " + unit.id);
                return;
            }
            ret.push(unit);
        });
        callback(null, ret);
    });
}

/**
 * Get Clients from database.
 * @param {Object} filter used to filter task groups
 * @param {Function<err, clients>} callback the callback function
 * @since 1.3
 */
function getClients(filter, callback) {
    var error = validator.validate({filter: filter}, {filter: "anyObject"});
    if (error) {
        callback(error);
        return;
    }
    Client.find(filter, callback);
}

/**
 * Update client's workflow.
 * @param {String} clientId the client id
 * @param {String} workflowId the workflow id
 * @param {Object} workflow the new values to update
 * @param {Function<err>} callback the callback
 * @since 1.3
 */
function updateWorkflow(clientId, workflowId, workflow, callback) {
    var error = validator.validate({
        clientId: clientId,
        workflowId: workflowId,
        workflow: workflow
    }, {
        clientId: "objectId",
        workflowId: "objectId",
        workflow: "workflow"
    });
    if (error) {
        callback(error);
        return;
    }
    async.waterfall([
        function (cb) {
            Client.findById(clientId, cb);
        }, function (client, cb) {
            if (!client) {
                cb(new Error("Client not found with id=" + clientId));
                return;
            }
            var current = _.find(client.workflows, function (wf) {
                return String(wf.id) === String(workflowId);
            });
            if (!current) {
                cb(new Error("Workflow not found with id=" + workflowId + " for client with id=" + clientId));
                return;
            }
            current.name = workflow.name;
            current.input = workflow.input;
            current.output = workflow.output;
            current.taskGroups = workflow.taskGroups;
            current.markModified("taskGroups");
            client.save(cb);
        }
    ], function (err) {
        callback(err);
    });
}


/**
 * Log job link if flag LOG_LINKS_CREATED_JOB is set to true.
 * @param {Number} jobId the job id
 * @private
 * @since 1.3
 */
function _logJobLink(jobId) {
    if (!config.LOG_LINKS_OF_CREATED_JOBS) {
        return;
    }
    crowdFlowerService.getJobDetails(jobId, function (err, job) {
        if (err) {
            //ignore error, it's already logged.
            return;
        }
        var url = config.INTERNAL_JOB_URL_TEMPLATE
            .replace("{job_id}", jobId)
            .replace("{secret}", encodeURIComponent(job.secret));
        winston.info(url);
        if (config.EXEC_JOB_URL_IN_BROWSER_COMMAND) {
            setTimeout(function () {
                require("child_process").exec(config.EXEC_JOB_URL_IN_BROWSER_COMMAND + " " + url);
            }, config.EXEC_JOB_URL_IN_BROWSER_COMMAND_TIMEOUT);
        }
    });
}


/**
 * Verify if a work unit meets entry condition of a task group.
 * @param {String} entryCondition the javascript condition in plain text
 * @param {WorkUnit} workUnit the work unit
 * @returns {Boolean} true if meets condition
 * @private
 */
function _verifyTaskGroupEntryCondition(entryCondition, workUnit) {
    try {
        var ctx = _.clone(workUnit.evaluationContext);
        ctx.STATS = workUnit.statistics;
        return localeval(entryCondition, ctx);
    } catch (e) {
        //it will throw exception if used variable in entryCondition is not defined in evaluationContext
        return false;
    }
}

/**
 * Verify if a work unit meets entry condition of a task.
 * @param {Task} task the task
 * @param {WorkUnit} workUnit the work unit
 * @returns {Boolean} true if meets condition
 * @private
 */
function _verifyTaskEntryCondition(task, workUnit) {
    // Verify if all of the task's predecessors are done
    var predecessorsDone = _.every(task.predecessors, function (jobId) {
        return !_.isUndefined(workUnit.evaluationContext["J" + jobId + "_judgement_count"]);
    });
    if (!predecessorsDone) {
        return false;
    }

    var condition = _verifyTaskGroupEntryCondition(task.entryCondition, workUnit);
    if (!condition) {
        return false;
    }

    // Verify if the task is not done or in-progress for the work unit
    var isDone = !_.isUndefined(
        _.find(workUnit.finishedCrowdFlowerUnits, function (unit) {
            return unit.crowdFlowerJobId === task.crowdFlowerJobId;
        })
    );
    var isInProgress = !_.isUndefined(
        _.find(workUnit.inProgressCrowdFlowerUnits, function (unit) {
            return unit.crowdFlowerJobId === task.crowdFlowerJobId;
        })
    );

    return !isDone && !isInProgress;
}

/**
 * Generate document data for given phase result
 * @param {Array} workUnitResult the result of work unit phase
 * @returns {Object} the insert data for document
 * @private
 */
function _getDocumentInsertData(workUnitResult) {
    var data = {};
    _.each(workUnitResult, function (result) {
        _.each(result.fields, function (field) {
            data[field.name] = field.value;
        });
    });
    return data;
}

/**
 * Merge all Classification result fields as the filter for Document
 * @param {WorkUnit} workUnit the work unit
 * @returns {Object} the mongodb search object
 * @private
 */
function _getDocumentClassificationFilter(workUnit) {
    var filter = {};
    // Merge all Classification result fields as the filter for Document
    _.each(workUnit.classificationResults, function (result) {
        _.each(result.fields, function (field) {
            filter["data." + field.name] = field.value;
        });
    });
    return filter;
}

/**
 * Mark document as read and add data from taxonomy phase
 * @param {WorkUnit} workUnit the work unit
 * @param {Boolean} allowEmpty true if set document ready with empty taxonomy
 * @param {Function<err>} callback the callback function
 * @private
 */
function _setDocumentReady(workUnit, allowEmpty, callback) {
    if (!workUnit.taxonomyResults.length && !allowEmpty) {
        //do nothing, work unit was not in taxonomy phase
        callback();
        return;
    }
    var filter = _getDocumentClassificationFilter(workUnit);
    async.waterfall([
        function (cb) {
            Document.findOne(filter, cb);
        }, function (document, cb) {
            if (!document) {
                //it can only happen if someone delete document from database or review/escalation task
                //changed classification fields
                //it's better to recreate a document
                winston.info("Document not found for workUnit id = %d. Recreating.", workUnit.id);
                document = new Document({});
            }
            _.extend(document.data, workUnit.evaluationContext);
            document.isReady = true;
            winston.info("Document is ready for workUnit id = %d", workUnit.id);
            document.markModified("data");
            document.save(cb);
        }, function (document, count, cb) {
            //fix the issue with parallel updates
            Document.findByIdAndUpdate(document.id, {$set: {
                taxonomyResults: workUnit.taxonomyResults
            }}, cb);
        }
    ], function (err) {
        callback(err);
    });
}

/**
 * Verify if work unit represents a new document.
 * @param {WorkUnit} workUnit the work unit
 * @param {Function<err, isNew, isReady>} callback the callback function
 * @private
 */
function _verifyNewDocument(workUnit, callback) {
    var filter = _getDocumentClassificationFilter(workUnit);
    // Search Document
    async.waterfall([
        function (cb) {
            Document.findOne(filter, cb);
        }, function (document, cb) {
            if (document) {
                if (!document.isReady) {
                    cb(null, false, false);
                    return;
                }
                // Copy the document fields to evaluationContext of the work unit
                // so that the extraction tasks entry condition can be properly evaluated
                _.extend(workUnit.evaluationContext, document.data);
                workUnit.taxonomyResults = document.toObject().taxonomyResults;
                cb(null, false, true);
            } else {
                var dataToInsert = _getDocumentInsertData(workUnit.classificationResults);
                Document.create({
                    data: dataToInsert
                }, function (err) {
                    callback(err, true, false);
                });
            }
        }
    ], callback);
}


/**
 * Queued version of _verifyNewDocument. Only one document can be checked on the same time.
 * @param {WorkUnit} workUnit the work unit
 * @param {Function<err, isNew, isReady>} callback the callback function
 * @private
 * @since 1.8
 */
function _verifyNewDocumentAsQueue(workUnit, callback) {
    if (!verifyDocumentQueue) {
        verifyDocumentQueue = async.queue(_verifyNewDocument, 1);
    }
    verifyDocumentQueue.push(workUnit, callback);
}

/**
 * Generate result XML of a work unit.
 * @param {WorkUnit} workUnit the work unit
 * @returns {String} the generated xml
 * @private
 */
function _generateWorkUnitResultXML(workUnit) {
    var xw = new XMLWriter(true);
    xw.startDocument();
    xw.startElement('Results')
        .writeAttribute('clientId', workUnit.client.id)
        .writeAttribute('clientName', workUnit.client.name);

    /**
     * local function to aggregate work unit results
     * We need to iterate through all fields of all results, so that
     * later tasks (usually expert tasks) override earlier tasks (usually normal task)
     * @param {Array} results the classification results
     * @returns {Object} the aggregated elements
     */
    var aggregateWorkUnitResults = function (results) {
        var fs = {};
        _.each(results, function (result) {
            _.each(result.fields, function (field) {
                field.jobName = result.crowdFlowerJobName;
                fs[field.name] = field;
            });
        });
        return fs;
    };

    /**
     * Create <Field> element and insert field data
     * @param {Object} field the field data
     * @param {String} name the field name
     */
    var writeField = function (field, name) {
        xw
            .startElement('Field')
            .writeAttribute('name', name)
            // 8/11/14 JF - Updated to allow for null/number values
            .writeAttribute('value', String(field.value))
            .writeAttribute('confidence', String(field.confidence))
            .writeAttribute('jobname', String(field.jobName))
            .endElement();
    };

    // Classification results
    xw.startElement('Classification');
    _.each(aggregateWorkUnitResults(workUnit.classificationResults), writeField);
    xw.endElement();

    // Taxonomy results
    xw.startElement('Taxonomy');
    _.each(aggregateWorkUnitResults(workUnit.taxonomyResults), writeField);
    xw.endElement();

    // Extraction results
    xw.startElement('Extraction');
    _.each(aggregateWorkUnitResults(workUnit.extractionResults), writeField);
    xw.endElement();

    xw.endDocument();
    return xw.toString();
}

/**
 * Transform the cf unit result using set of transformation rules
 * @param {Object} transformation the transformation rules to use
 * @param {Object} result the CF unit result
 * @param {Object} context the evaluation context
 * @private
 * @since 1.1
 */
function _transformResult(transformation, context, result) {
    var commands = _.isArray(transformation.exec) ? transformation.exec : [transformation.exec];
    _.each(commands, function (command) {
        context.$add = {};
        context.$set = {};
        try {
            localeval(command, context);
        } catch (e) {
            winston.error("Failed to exec command: " + command, e);
            return;
        }
        _.each(context.$add, function (value, name) {
            result.fields.push({
                name: name,
                value: value,
                confidence: 1
            });
            context[name] = value;
            context[name + '_confidence'] = 1;
        });
        var name2Field = {};
        _.each(result.fields, function (field) {
            name2Field[field.name] = field;
        });
        _.each(context.$set, function (value, name) {
            if (!name2Field[name]) {
                winston.error("Failed to exec command: %s. Field '%s' doesn't exist in response.", command, name);
            } else {
                name2Field[name].value = value;
                context[name] = value;
            }
        });
    });
    delete context.$add;
    delete context.$set;
}


/**
 * Update the unit's evaluationContext with the following:
 * - field value
 * - field confidence
 * @param {Object} evaluationContext the object where fields will be added
 * @param {Array} fields the fields of the cfUnit result
 * @private
 * @since 1.3
 */
function _updateEvaluationContext(evaluationContext, fields) {
    _.each(fields, function (field) {
        evaluationContext[field.name] = field.value;
        evaluationContext[field.name + '_confidence'] = field.confidence;
    });
}


/**
 * Apply result from Review or Escalation task to work unit.
 * @param {WorkUnit} unit the work unit
 * @param {CrowdFlowerUnit} cfUnit the crowdflower unit
 * @param {Object} unitResult the result of the cfUnit
 * @param {Function<err>} callback the callback function
 * @private
 * @since 1.3
 */
function _applyReviewOrEscalationResult(unit, cfUnit, unitResult, callback) {
    var sig = logging.createSignatureForWorkflow(unit.client, unit.workflow, true);
    var logPrefix = util.format(sig + "CF Unit JobId=%d, UnitId=%d : ",
        cfUnit.crowdFlowerJobId,  cfUnit.crowdFlowerUnitId);
    var classificationFields = [],
        taxonomyFields = [],
        extractionFields = [],
        documentFiler = _getDocumentClassificationFilter(unit),
        replaceClassification = false,
        replaceTaxonomy = false,
        replaceExtraction = false,
        useAsTaxonomy = false,
        results,
        resultValues = {
            crowdFlowerJobId: unitResult.crowdFlowerJobId,
            crowdFlowerJobName: unitResult.crowdFlowerJobName,
            crowdFlowerUnitId: unitResult.crowdFlowerUnitId,
            judgmentCount: unitResult.judgmentCount
        };

    /**
     * Check if field.value contains correct value.
     * @param {Object} field the field to check
     * @returns {Boolean} the flag whether is correct
     */
    var isTrue = function (field) {
        if (field.value !== CONST.STRING_TRUE && field.value !== CONST.STRING_FALSE) {
            winston.error(logPrefix + "invalid value for field '%s', expected '%s' or '%s', got '%s'",
                field.name, CONST.STRING_TRUE, CONST.STRING_FALSE, field.value);
            return false;
        }
        return field.value === CONST.STRING_TRUE;
    };

    /**
     * Check if given field matches given prefix and add to results.
     * @param {Object} field the field
     * @param {String} prefix the expected prefix of field.name
     * @param {Array} results the array of results to append
     * @return {Boolean} true if field matches given string
     */
    var checkMatch = function (field, prefix, results) {
        if (field.name.indexOf(prefix) === 0) {
            field.name = field.name.replace(prefix, "");
            results.push(field);
            return true;
        }
        return false;
    };
    _.each(unitResult.fields, function (field) {
        if (field.name.indexOf(CONST.COMMAND_PREFIX) === 0) {
            // check for available commands
            if (!isTrue(field)) {
                return;
            }
            switch (field.name) {
            case CONST.COMMAND_REPLACE_CLASSIFICATION:
                replaceClassification = true;
                break;
            case CONST.COMMAND_REPLACE_TAXONOMY:
                replaceTaxonomy = true;
                break;
            case CONST.COMMAND_REPLACE_EXTRACTION:
                replaceExtraction = true;
                break;
            case CONST.COMMAND_USE_AS_TAXONOMY:
                useAsTaxonomy = true;
                break;
            default:
                winston.error(logPrefix + "unknown command '%s'", field.name);
                return;
            }
            return;
        }
        if (!checkMatch(field, CONST.CLASSIFICATION_FIELD_PREFIX, classificationFields) &&
                !checkMatch(field, CONST.TAXONOMY_FIELD_PREFIX, taxonomyFields) &&
                !checkMatch(field, CONST.EXTRACTION_FIELD_PREFIX, extractionFields)) {
            winston.error(logPrefix + "unknown field name '%s'", field.name);
        }
    });
    if (replaceClassification) {
        winston.info(logPrefix + "replacing classification results");
        results = _.clone(resultValues);
        results.fields = classificationFields;
        unit.classificationResults = results;
        _updateEvaluationContext(unit.evaluationContext, classificationFields);
    }
    if (replaceTaxonomy) {
        winston.info(logPrefix + "replacing taxonomy results");
        results = _.clone(resultValues);
        results.fields = taxonomyFields;
        unit.taxonomyResults = results;
        if (!unit.evaluationContext.TAXONOMY) {
            unit.evaluationContext.TAXONOMY = {};
        }
        _updateEvaluationContext(unit.evaluationContext.TAXONOMY, taxonomyFields);
    }
    if (replaceExtraction) {
        winston.info(logPrefix + "replacing extraction results");
        results = _.clone(resultValues);
        results.fields = extractionFields;
        unit.extractionResults = results;
        _updateEvaluationContext(unit.evaluationContext, extractionFields);
    }
    async.waterfall([
        function (cb) {
            if (!useAsTaxonomy) {
                cb();
                return;
            }
            async.waterfall([
                function (cb) {
                    winston.info(logPrefix + "updating document's taxonomy results");
                    if (replaceClassification) {
                        // find and remove old document
                        Document.findOne(documentFiler, function (err, document) {
                            if (err) {
                                cb(err);
                                return;
                            }
                            if (!document) {
                                winston.info(logPrefix + "old document not found");
                                cb();
                                return;
                            }
                            document.remove(function (err) {
                                if (!err) {
                                    winston.info(logPrefix + "old document removed");
                                }
                                cb(err);
                            });
                        });
                    } else {
                        cb();
                    }
                }, function (cb) {
                    // it will update document or create new one
                    _setDocumentReady(unit, false, cb);
                }
            ], function (err) {
                cb(err);
            });
        }, function (cb) {
            //cfUnit exists in unit.inProgressCrowdFlowerUnits
            cfUnit.isDone = true;
            unit.evaluationContext['J' + cfUnit.crowdFlowerJobId + '_judgement_count'] = unitResult.judgmentCount;
            unit.markModified("evaluationContext");
            unit.save(cb);
        }
    ], function (err) {
        callback(err);
    });
}

/**
 * Get list of tasks that match conditions for given work unit.
 * @param {WorkUnit} unit the work unit
 * @param {Array} phases the allowed phases to filter
 * @returns {Array} the list of tasks
 * @private
 * @since 1.3
 */
function _getValidTasks(unit, phases) {
    return _.chain(unit.taskGroups)
        // verify if entry condition is met and is in allowed phase
        .filter(function (taskGroup) {
            return _.contains(phases, taskGroup.processingPhase) &&
                _verifyTaskGroupEntryCondition(taskGroup.entryCondition, unit);
        })
        .pluck("tasks")
        .flatten()
        .filter(function (task) {
            // verify if the task's predecessors are done and the task itself
            // is not done or in progress for the unit
            return _verifyTaskEntryCondition(task, unit);
        })
        .value();
}

/**
 * Fetch results of work units.
 * @param {Function<err>} callback the callback function
 */
function fetchWorkUnitResults(callback) {
    var signature = "WorkflowService#fetchWorkUnitResults", page = 0;
    var units;

    async.doWhilst(function (cb) {
        async.waterfall([
            function (cb) {
                getWorkUnits({ isDone : false, offset: page * PARALLEL_LIMIT, limit: PARALLEL_LIMIT }, cb);
            }, function (result, cb) {
                units = result;

                // Iterate through Work Units
                winston.info("fetchWorkUnitResults found %d WorkUnits (page %d)", units.length, page);
                async.forEach(units, function (unit, cb) {
                    var sig = logging.createSignatureForWorkflow(unit.client, unit.workflow, true);
                    // Iterate through CrowdFlower units of the Work Unit
                    async.forEach(unit.inProgressCrowdFlowerUnits, function (cfUnit, cb) {
                        // Fetch result of the CrowdFlower unit
                        crowdFlowerService.getUnitResult(cfUnit.crowdFlowerJobId, cfUnit.crowdFlowerUnitId,
                            function (err, isDone, result) {
                                if (err) {
                                    cb(err);
                                    return;
                                }
                                if (!isDone) {
                                    cb();
                                    return;
                                }

                                winston.info(sig + "CF Unit JobId=%d, UnitId=%d is done (phase %s), result: %j",
                                    cfUnit.crowdFlowerJobId, cfUnit.crowdFlowerUnitId, unit.processingPhase, result, {});

                                if (unit.processingPhase === WorkUnitProcessingPhase.REVIEW ||
                                        unit.processingPhase === WorkUnitProcessingPhase.ESCALATION) {
                                    _applyReviewOrEscalationResult(unit, cfUnit, result, cb);
                                    return;
                                }

                                cfUnit.isDone = true;
                                cfUnit.endTime = new Date();

                                // update the unit's evaluationContext with the following:
                                // - judgement count for the job
                                // - field value
                                // - field confidence
                                unit.evaluationContext['J' + cfUnit.crowdFlowerJobId + '_judgement_count'] = result.judgmentCount;
                                _updateEvaluationContext(unit.evaluationContext, result.fields);
                                //for taxonomy phase, create extra sub object, which will keep values from taxonomy only
                                if (unit.processingPhase === WorkUnitProcessingPhase.TAXONOMY) {
                                    if (!unit.evaluationContext.TAXONOMY) {
                                        unit.evaluationContext.TAXONOMY = {};
                                    }
                                    _updateEvaluationContext(unit.evaluationContext.TAXONOMY, result.fields);
                                }

                                unit.cost += result.cost;
                                unit.evaluationContext['J' + cfUnit.crowdFlowerJobId + '_endTime'] = cfUnit.endTime;

                                _transformResult(cfUnit.transformation, unit.evaluationContext, result);

                                if (unit.processingPhase === WorkUnitProcessingPhase.CLASSIFICATION) {
                                    unit.classificationResults.push(result);
                                } else if (unit.processingPhase === WorkUnitProcessingPhase.TAXONOMY) {
                                    unit.taxonomyResults.push(result);
                                } else if (unit.processingPhase === WorkUnitProcessingPhase.EXTRACTION) {
                                    unit.extractionResults.push(result);
                                }

                                unit.markModified("evaluationContext");
                                unit.save(cb);
                            });
                    }, logging.logAndIgnoreError(signature, cb));
                }, cb);
            }, function (cb) {
                getWorkUnits({ isDone : false, offset: page * PARALLEL_LIMIT, limit: PARALLEL_LIMIT }, cb);
            }, function (units, cb) {
                // Iterate through Work Units again
                async.forEach(units, function (unit, cb) {
                    var newDoneUnits = _.filter(unit.inProgressCrowdFlowerUnits, function (cfUnit) {
                        return cfUnit.isDone;
                    });
                    if (!newDoneUnits.length) {
                        cb();
                        return;
                    }
                    // Update finishedCrowdFlowerUnits and inProgressCrowdFlowerUnits
                    unit.finishedCrowdFlowerUnits = _.union(unit.finishedCrowdFlowerUnits, newDoneUnits);
                    unit.inProgressCrowdFlowerUnits = _.filter(unit.inProgressCrowdFlowerUnits, function (cfUnit) {
                        return !cfUnit.isDone;
                    });
                    unit.markModified('finishedCrowdFlowerUnits');
                    unit.markModified('inProgressCrowdFlowerUnits');
                    unit.save(cb);
                }, logging.logAndIgnoreError(signature, cb));
            }
        ], cb);
    }, function () {
        page++;
        return units.length;
    }, callback);
}


/**
 * Process work units of a given processing phase.
 * @param {WorkUnitProcessingPhase} processingPhase the phase to process
 * @param {Function<err>} callback the callback function
 */
function processWorkUnits(processingPhase, callback) {
    var error = validator.validate({processingPhase: processingPhase},
        {processingPhase: {"enum": _.values(WorkUnitProcessingPhase)}});
    if (error) {
        callback(error);
        return;
    }

    var page = 0;
    var units;
    var signature = "WorkflowService#processWorkUnits";
    // moved work unit to Escalation phase
    var escalated = {};
    async.doWhilst(function (cb) {
        async.waterfall([
            function (cb) {
                getWorkUnits({
                    isDone: false,
                    processingPhase: processingPhase,
                    offset: page * PARALLEL_LIMIT,
                    limit: PARALLEL_LIMIT
                }, cb);
            }, function (results, cb) {
                units = results;
                async.forEach(units, function (unit, cb) {
                    var sig = logging.createSignatureForWorkflow(unit.client, unit.workflow, true);
                    if (processingPhase !== WorkUnitProcessingPhase.REVIEW &&
                            processingPhase !== WorkUnitProcessingPhase.ESCALATION) {
                        // check if work unit meets conditions for any escalation task
                        var count = _getValidTasks(unit, [WorkUnitProcessingPhase.ESCALATION]).length;
                        if (count) {
                            winston.info(sig + "Work unit with id=" + unit.id + " moved to ESCALATION phase");
                            unit.processingPhase = WorkUnitProcessingPhase.ESCALATION;
                            // cancel all in progress units in the background
                            async.forEach(unit.inProgressCrowdFlowerUnits, function (cfUnit, cb) {
                                crowdFlowerService.cancelUnit(cfUnit.crowdFlowerJobId,
                                    cfUnit.crowdFlowerUnitId,
                                    logging.logAndIgnoreError(sig + signature, cb));
                            });
                            //remove all pending tasks
                            unit.inProgressCrowdFlowerUnits = [];
                            unit.markModified("inProgressCrowdFlowerUnits");
                            escalated[unit.id] = true;
                            unit.save(logging.logAndIgnoreError(sig + signature, cb));
                            return;
                        }
                    }

                    var tasks = _getValidTasks(unit, [processingPhase]);

                    async.forEach(tasks, function (task, cb) {
                        // this work unit should be uploaded to the task
                        crowdFlowerService.createUnit(task.crowdFlowerJobId, unit, task.input, function (err, crowdFlowerUnitId) {
                            if (err) {
                                winston.info('Error occurred during CFService.createUnit', err);
                                cb(err);
                                return;
                            }
                            winston.info(sig + "CF Unit JobId=%d, UnitId=%d created (phase %s)", task.crowdFlowerJobId,
                                crowdFlowerUnitId, processingPhase);
                            var startTime = new Date();
                            _logJobLink(task.crowdFlowerJobId);
                            unit.inProgressCrowdFlowerUnits.push({
                                crowdFlowerJobId: task.crowdFlowerJobId,
                                crowdFlowerUnitId: crowdFlowerUnitId,
                                isDone: false,
                                transformation: task.transformation,
                                startTime: startTime
                            });
                            unit.evaluationContext['J' + task.crowdFlowerJobId + '_startTime'] = startTime;
                            unit.evaluationContext['J' + task.crowdFlowerJobId + '_endTime'] = null;
                            unit.markModified("evaluationContext");
                            unit.save(cb);
                        });
                    }, logging.logAndIgnoreError(sig + signature, cb));
                }, cb);
            }, function (cb) {
                async.forEach(units, function (unit, cb) {
                    var sig = logging.createSignatureForWorkflow(unit.client, unit.workflow, true);
                    if (unit.inProgressCrowdFlowerUnits.length !== 0 || escalated[unit.id]) {
                        cb();
                        return;
                    }
                    var logMsg = sig + "Work unit with id=" + unit.id + " processed to phase: ";
                    if (processingPhase === WorkUnitProcessingPhase.CLASSIFICATION) {
                        // Verify if new document
                        _verifyNewDocumentAsQueue(unit, function (err, isNew, isReady) {
                            if (err) {
                                cb(err);
                                return;
                            }
                            if (isNew === true) {
                                // New document, transit to TAXONOMY phase
                                unit.processingPhase = WorkUnitProcessingPhase.TAXONOMY;
                            } else if (isReady) {
                                // Not new document, transit to EXTRACTION phase
                                unit.processingPhase = WorkUnitProcessingPhase.EXTRACTION;
                                unit.markModified("evaluationContext");
                            } else {
                                // Do nothing, wait until document is ready
                                winston.info(sig + "Document not ready for work unit id=" + unit.id);
                                cb();
                                return;
                            }
                            winston.info(logMsg + unit.processingPhase);
                            unit.save(cb);
                        });
                    } else if (processingPhase === WorkUnitProcessingPhase.TAXONOMY) {
                        // transit to EXTRACTION phase
                        unit.processingPhase = WorkUnitProcessingPhase.EXTRACTION;
                        // save extracted properties from taxonomy
                        _setDocumentReady(unit, true, function (err) {
                            if (err) {
                                cb(err);
                                return;
                            }
                            winston.info(logMsg + unit.processingPhase);
                            unit.save(cb);
                        });
                    } else if (processingPhase === WorkUnitProcessingPhase.EXTRACTION) {
                        // transit to REVIEW phase
                        unit.processingPhase = WorkUnitProcessingPhase.REVIEW;
                        winston.info(logMsg + unit.processingPhase);
                        unit.save(cb);
                    } else if (processingPhase === WorkUnitProcessingPhase.REVIEW ||
                            processingPhase === WorkUnitProcessingPhase.ESCALATION) {
                        // entire workflow is done, generate XML output and save to Box
                        unit.resultXML = _generateWorkUnitResultXML(unit);
                        boxService.saveWorkUnitOutput(unit, function (err) {
                            if (err) {
                                cb(err);
                                return;
                            }
                            unit.isDone = true;
                            unit.endTime = new Date();
                            unit.evaluationContext.endTime = unit.endTime;
                            winston.info(sig + "Work unit with id=%d is done", unit.id);
                            unit.markModified("evaluationContext");
                            unit.save(cb);
                        });
                    } else {
                        // extra insurance
                        cb(new Error('Unknown phase: ' + processingPhase));
                    }
                }, logging.logAndIgnoreError(signature, cb));
            }
        ], cb);
    }, function () {
        page++;
        return units.length;
    }, callback);
}


module.exports = {
    fetchWorkUnitResults: logging.createWrapper(fetchWorkUnitResults, {input: [], output: [], signature: "WorkflowService#fetchWorkUnitResults"}),
    processWorkUnits: logging.createWrapper(processWorkUnits, {input: ["processingPhase"], output: [], signature: "WorkflowService#processWorkUnits"}),
    getWorkUnits: logging.createWrapper(getWorkUnits, {input: ["filter"], output: ["unitWorks"], signature: "WorkflowService#getWorkUnits"}),
    getClients: logging.createWrapper(getClients, {input: ["filter"], output: ["clients"], signature: "WorkflowService#getClients"}),
    updateWorkflow: logging.createWrapper(updateWorkflow, {input: ["clientId", "workflowId", "workflow"], output: [], signature: "WorkflowService#updateWorkflow"})
};
