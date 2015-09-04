/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the controller that exposes AJAX actions managing transformation results.
 *
 * @version 1.2
 * @author albertwang, j3_guile, TCSASSEMBLER
 * 
 * Changes in 1.1:
 * 1. remove getTransformedResultList and replace it by searchTransformedResults
 * 2. Add next/prev support to getTransformedResult
 *
 * Changes in 1.2:
 * - Updated the configuration file path.
 */
"use strict";

var _ = require('underscore');
var async = require('async');

var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var User = mongoose.model('User', require('../models/User').UserSchema);

var webhookService = require('../services/WebhookService');
var transformationService = require('../services/ResultTransformationService');

var delegates = require('../helpers/DelegateFactory');
var transformconfiguration = require('../transformconfiguration/transformconfiguration');
var CONTROLLER = 'ClientUserController';

var HIDDEN_REVIEW_STATUSES = ['Support Review', 'Not Reviewed'];
var PAGE_SIZE = 25;

/**
 * Applies the given field update to any matching transformation field.
 *
 * @param {Object} transformedResult the transformation result object
 * @param {Object} update the field update to apply
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 * @private
 */
function _applyFieldUpdate(transformedResult, update, callback) {
    if (update.name === 'ReviewStatus') {
        transformedResult.reviewStatus = update.value;
        return callback();
    }

    if (update.name === 'AssignedStatus') {
        transformedResult.assignedStatus = update.value;
        return callback();
    }

    if (update.name === 'Notes') {
        transformedResult.notes = update.value;
        return callback();
    }

    var field = _.find(transformedResult.fields, function (cField) {
        return cField.name === update.name;
    });

    if (field && field.value === update.value) {
        return callback();
    }
    var newField = false;
    if (!field && update.value !== "") {
        field = update;
        newField = true;
    }
    if (!field) {
        return callback();
    }
    async.waterfall([
        /*function (cb) {
            service.addWorkflowMappingRule(transformedResult.workflowId, {
                fieldName: field.name,
                value: field.value,
                mappedValue: newField?"":update.value
            }, cb);
        },

        // Update field value
        function (mappingRule, cb) {*/
        function (cb) {
            if (!newField) {
                field.value = update.value;
            } else {
                if (transformedResult.fields === undefined) {
                    transformedResult.fields = [];
                }
                transformedResult.fields.push(field);
            }
            cb();
        }
    ], callback);
}

/**
 * Sets the status of the given transformation to 'ready_for_import' then notifies the webhooks.
 * @param {Object} transformedResult the transformation result object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the updated object
 * @private
 */
function _updateResultStatus(transformedResult, callback) {
    async.waterfall([
        // Change status
        function (cb) {
            transformedResult.status = 'ready_for_import';
            transformationService.saveTransformedResult(transformedResult, cb);
        },

        // Send webhook notification
        function (transformedResult, cb) {
            webhookService.notifyWebhook(transformedResult.clientId, 'result_ready_for_import',
                _.pick(transformedResult, 'id', 'status', 'workUnitId', 'workflowId'), cb);
        }
    ], function (err) {
        callback(err, transformedResult);
    });
}

/**
 * Get search and sort criteria based on current user and query string
 * @param {Object} req the expressJS request object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) searchCriteria - the search criteria
 *    2) sortCriteria - the sorting conditions
 * @private
 */
function _getTransformationResultCriteria(req, callback) {
    var user, searchCriteria = {};
    async.waterfall([
        function (cb) {
            User.findOne({username: req.user}, cb);
        }, function (result, cb) {
            user = result;
            //Make sure that the user is authorized to retrieve results with status requested
            if (!user.isAdmin && req.query.resultStatus !== 'import_failed') {
                return cb({status: 403, message: 'Not authorized to get that result'});
            }
            searchCriteria['value.clientId'] = user.clientId;
            searchCriteria['value.status'] = {$in: ['import_failed', 'import_succeeded', 'rejected']};
            if (!user.isAdmin) {
                searchCriteria['value.reviewStatus'] = {$nin: HIDDEN_REVIEW_STATUSES};
            }
            if (req.query.resultStatus && req.query.resultStatus !== 'all') {
                searchCriteria['value.status'] = req.query.resultStatus;
            }
            if (req.query.filter) {
                searchCriteria.$text = {$search: req.query.filter};
            }
            var sortCriteria = {};
            if (req.query.sort) {
                req.query.sort.split(",").forEach(function (value) {
                    if (value[0] === "-") {
                        sortCriteria["value." + value.substr(1)] = -1;
                    } else {
                        sortCriteria["value." + value] = 1;
                    }
                });
            }
            cb(null, searchCriteria, sortCriteria);
        }
    ], callback);
}

/**
 * Retrieves a TransformedResult object with the given id (only if it is accessible for the current user).
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the requested object
 * @since 1.1
 */
function getTransformedResult(req, res, callback) {
    var transformedResult;
    async.waterfall([
        function (cb) {
            transformationService.getTransformedResult(req.params.id, cb);
        },
        // get the user object to verify data access
        function (result, cb) {
            transformedResult = result;
            User.findOne({username: req.user}, cb);
        },
        // return the result only if it is accessible
        function (user, cb) {
            if (!user || !transformedResult || transformedResult.clientId !== user.clientId) {
                return cb({status: 404, message: 'Cannot find the result.'});
            }
            if (!user.isAdmin && transformedResult.status !== 'import_failed') {
                return cb({status: 403, message: 'Not authorized to get that result'});
            }
            if (req.skipNextAndPrev) {
                return callback(null, transformedResult);
            }
            _getTransformationResultCriteria(req, cb);
        }, function (searchCriteria, sortCriteria, cb) {
            transformationService.getPrevAndNextTransformationElements(req.params.id, searchCriteria, sortCriteria, cb);
        }, function (prev, next, cb) {
            transformedResult = transformedResult.toJSON();
            transformedResult.prev = prev;
            transformedResult.next = next;
            cb(null, transformedResult);
        }
    ], callback);
}

/**
 * Search transformed results (only if it is accessible for the current user).
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) result - the search result (object with `items` and `total` properties)
 */
function searchTransformedResults(req, res, callback) {
    async.waterfall([
        function (cb) {
            _getTransformationResultCriteria(req, cb);
        }, function (searchCriteria, sortCriteria, cb) {
            var page = Number(req.query.page) || 1;
            var offset = (page - 1) * PAGE_SIZE;
            transformationService.searchTransformedResults(searchCriteria, sortCriteria, offset, PAGE_SIZE, cb);
        }
    ], callback);
}

/**
 * Updates a TransformedResult object with the given fields.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the updated object
 */
function updateTransformedResult(req, res, callback) {
    var updatedFields = req.body;
    var readyForImport = req.query.import === "true";

    if (!_.isArray(updatedFields)) {
        return callback({status: 400, message: 'Request must contain an array of field objects.'});
    }

    async.waterfall([
        // Get the saved transformation result and ensure user can access it
        function (cb) {
            req.skipNextAndPrev = true;
            getTransformedResult(req, res, cb);
        },

        // Apply the fields from the request body
        function (transformedResult, done) {
            async.each(updatedFields, function (update, applied) {
                _applyFieldUpdate(transformedResult, update, applied);
            }, function (err) {
                if (err) {
                    return done(err);
                }

                if (readyForImport) {
                    _updateResultStatus(transformedResult, done);
                } else {
                    //No need for status update. Just save the result
                    transformationService.saveTransformedResult(transformedResult, done);
                }
            });
        }
    ], callback);
}

/**
 * Retrieves a TransformedConfiguration object with the given type.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) TransformedConfiguration - the requested object
 */
function getTransformedConfiguration(req, res, callback) {
    callback(null, transformconfiguration[req.params.type.toString().toUpperCase()]);
}

/**
 * Updates Status of TransformedResult object
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformedResult - the updated object
 */
function updateTransformedResultStatus(req, res, callback) {
    var status = req.body;
    async.waterfall([
        // Get the saved transformation result and ensure user can access it
        function (cb) {
            req.skipNextAndPrev = true;
            getTransformedResult(req, res, cb);
        },
         // Apply the fields from the request body
        function (transformedResult) {
            async.waterfall([
                // Change status
                function (cb) {
                    transformedResult.status = status.status;
                    transformationService.saveTransformedResult(transformedResult, cb);
                },

            ], function (err) {
                callback(err, transformedResult);
            });
        }
    ], callback);
}

module.exports = {
    getTransformedResult: delegates.controller(CONTROLLER, getTransformedResult),
    updateTransformedResult: delegates.controller(CONTROLLER, updateTransformedResult),
    getTransformedConfiguration: delegates.controller(CONTROLLER, getTransformedConfiguration),
    updateTransformedResultStatus: delegates.controller(CONTROLLER, updateTransformedResultStatus),
    searchTransformedResults: delegates.controller(CONTROLLER, searchTransformedResults)
};
