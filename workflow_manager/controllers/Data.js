/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
"use strict";

/**
 * Represents Data controller
 * @version 1.1
 * @author Sky_
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */

var async = require('async');
var libxmljs = require('libxmljs');
var config = require("../../config");
var wrapExpress = require("../helpers/logging").wrapExpress;
var boxService = require("../services/BoxService");
var workflowService = require("../services/WorkflowService");
var validator = require("../helpers/validator");


/**
 * Search for work units
 * @param {Object} req the request object
 * @param {Function} callback the callback function
 */
function search(req, callback) {
    var error = validator.validate(req.body, "anyObject");
    if (error) {
        return callback(error);
    }
    workflowService.getWorkUnits(req.body, callback);
}


/**
 * Update work unit document
 * @param {Object} req the request object
 * @param {Function} callback the callback function
 */
function updateDocument(req, callback) {
    var definition = {
        context: {type: "anyObject", required: false},
        xml: {type: String, required: false}
    }, workflow;
    async.waterfall([
        function (cb) {
            if (req.body.xml) {
                try {
                    libxmljs.parseXml(req.body.xml);
                } catch (e) {
                    return cb(new Error("Invalid XML"));
                }
            }
            cb(validator.validate(req.body, definition));
        },
        function (cb) {
            workflowService.getWorkUnits({_id: Number(req.params.id)}, cb);
        }, function (entities, cb) {
            if (!entities.length) {
                return cb(new Error('work unit not found'));
            }
            workflow = entities[0];
            if (!workflow.isDone && req.body.xml) {
                return cb(new Error('Cannot update xml for in progress documents'));
            }
            if (req.body.context) {
                workflow.evaluationContext = req.body.context;
            }
            if (req.body.xml) {
                workflow.resultXML = req.body.xml;
            }
            workflow.save(cb);
        }, function (entity, count, cb) {
            if (req.body.xml) {
                boxService.updateWorkUnitOutput(entity, cb);
            } else {
                cb();
            }
        }
    ], function (err) {
        callback(err, {ok: true});
    });
}

module.exports = {
    search: wrapExpress("Data#search", search),
    updateDocument: wrapExpress("Data#updateDocument", updateDocument)
};