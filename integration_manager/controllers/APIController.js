/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the controller that exposes Integration Manager REST APIs.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var resultTransformationService = require('../services/ResultTransformationService');
var webhookService = require('../services/WebhookService');
var _ = require('underscore');
var async = require('async');
var libxml = require('libxmljs');

var delegates = require('../helpers/DelegateFactory');
var CONTROLLER = 'APIController';

/**
 * Sends the XML to the caller.
 * @param {Object} res the expressJS response object
 * @param {Document} doc the XML document as response
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) output - the committed output by this method
 * @private
 */
function _sendXML(res, doc, callback) {
    var output = doc.toString();
    res.set('Content-Type', 'application/xml');
    res.send(output);
    callback(null, output);
}

/**
 * Creates an error message and commits it.
 *
 * @param {Object} res the expressJS response object
 * @param {String} message the error message to return
 * @param {String} format json or xml
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) output - the committed output by this method
 * @private
 */
function _sendError(res, message, format, callback) {
    if (format === 'xml') {
        var doc = new libxml.Document();
        doc.node('Response').node('Error', message);
        _sendXML(res.status(500), doc, callback);
    } else {
        var output = { error: message };
        res.status(500).json(output);
        callback(null, JSON.stringify(output));
    }
}

/**
 * Search for TransformedResult objects using a filter.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) output - the committed output by this method
 */
function filterTransformedResults(req, res, callback) {
    var filter = _.pick(req.query, 'status', 'workUnitId', 'workflowId');
    filter.clientId = req.user.clientId; // client ID is from authenticated ClientAPIConfiguration record

    resultTransformationService.filterTransformedResults(filter, function (err, transformedResults) {

        var respondJSON = function () {
            if (err) {
                _sendError(res, 'Failed to filter transformed results.', 'json', callback);
            } else {

                // remove field.id as it is not part of the spec
                transformedResults = _.map(transformedResults, function (transformedResult) {
                    var resultNode = transformedResult.toJSON();
                    resultNode.fields = _.map(resultNode.fields, function (field) {
                        delete field.id;
                        return field;
                    });
                    return resultNode;
                });

                res.status(200).json(transformedResults);
                callback(null, JSON.stringify(transformedResults));
            }
        };

        var respondXML = function () {
            if (err) {
                return _sendError(res, 'Failed to filter transformed results.', 'xml', callback);
            }

            var doc = new libxml.Document();
            var root = doc.node('Response');
            _.each(transformedResults, function (transformedResult) {
                var resultNode = root.node('Result').attr(_.pick(transformedResult, 'id', 'clientId',
                    'clientName', 'workUnitId', 'workflowId', 'status'));
                _.each(transformedResult.fields, function (field) {
                    resultNode.node('Field').attr(_.pick(field, 'name', 'value', 'confidence', 'jobName',
                        'importFailed', 'errorMessage'));
                });
            });

            _sendXML(res.status(200), doc, callback);
        };

        res.format({
            json: respondJSON,
            'application/xml': respondXML,
            default: respondJSON
        });
    });
}

/**
 * Bulk update TransformedResult status.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) output - the committed output by this method
 */
function updateTransformedResultsImportStatus(req, res, callback) {
    async.waterfall([
        // Update statuses
        function (cb) {
            resultTransformationService.updateTransformedResultsImportStatus(req.user.clientId, req.body, cb);
        },

        // Send webhook notifications if needed
        function (notUpdatedStatuses, cb) {
            var failedImportStatuses = _.filter(req.body, function (status) {
                return status.succeeded === false;
            });
            if (failedImportStatuses && failedImportStatuses.length > 0) {
                webhookService.notifyWebhook(req.user.clientId, 'result_import_failed', failedImportStatuses, function (err) {
                    cb(err, notUpdatedStatuses);
                });
            } else {
                cb(null, notUpdatedStatuses);
            }
        }
    ], function (err, notUpdatedStatuses) {

        var respondJSON = function () {
            if (err) {
                _sendError(res, 'Failed to update statuses.', 'json', callback);
            } else {
                var output = {
                    notUpdatedImportStatuses: _.map(notUpdatedStatuses, function (status) {
                        return _.pick(status, 'id');
                    })
                };
                res.status(200).json(output);
                callback(null, JSON.stringify(output));
            }
        };

        var respondXML = function () {
            if (err) {
                _sendError(res, 'Failed to update statuses.', 'xml', callback);
            } else {
                var doc = new libxml.Document();
                var root = doc.node('Response');
                _.each(notUpdatedStatuses, function (status) {
                    root.node('NotUpdatedImportStatus').attr(_.pick(status, 'id'));
                });

                _sendXML(res, doc, callback);
            }
        };

        res.format({
            json: respondJSON,
            xml: respondXML,
            default: respondJSON
        });
    });
}

module.exports = {
    filterTransformedResults: delegates.controller(CONTROLLER, filterTransformedResults, true),
    updateTransformedResultsImportStatus: delegates.controller(CONTROLLER, updateTransformedResultsImportStatus, true)
};