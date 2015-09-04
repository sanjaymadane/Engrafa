/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
"use strict";

/**
 * Represents Settings controller
 * @version 1.2
 * @author Sky_
 *
 * changes in 1.1:
 * 1. Return clients instead of taskGroups in clients.
 * 2. Change validate and saveWorkflow to match new schema of workflow.
 * 3. Use 0 for balance if api result is undefined.
 *
 * Changes in 1.2:
 * - Updated the configuration file path.
 */

var async = require('async');
var winston = require('winston');
var _ = require('underscore');
var config = require("../../config");
var exec = require('child_process').exec;
var wrapExpress = require("../helpers/logging").wrapExpress;
var workflowService = require("../services/WorkflowService");
var crowdFlowerService = require("../services/CrowdFlowerService");
var validator = require("../helpers/validator");
var socket = require('socket.io-client')(config.SOCKET_IO_CLIENT_URL);
var path = require('path');

/**
 * The request map that keeps information about the socket request and callbacks
 */
var mapRequests = {};

/**
 * The current request id
 */
var requestId = 0;

/**
 * Make request to socket server
 * @param {String} event the event name to emit
 * @param {Function<err, data>} callback the callback function
 * @private
 */
function _createSocketRequest(event, callback) {
    requestId += 1;
    var timeoutId = setTimeout(function () {
        callback(new Error('Cannot get response from background service. Request timeout.'));
    }, config.SOCKET_IO_TIMEOUT);
    mapRequests[requestId] = {
        callback: callback,
        timeoutId: timeoutId
    };
    socket.emit(event, {id: requestId});
}

socket.on('connect', function () {
    winston.info('socket-client: connect');
    //listen for OK response and call original callback
    socket.on("OK", function (data) {
        var request = mapRequests[data.id];
        if (!request) {
            winston.error("Request data not found for id: " + data.id);
            return;
        }
        clearTimeout(request.timeoutId);
        delete mapRequests[data.id];
        delete data.id;
        request.callback(null, data);
    });
});

/**
 * Get settings
 * @param {Function} callback the callback function
 */
function getSettings(callback) {
    async.parallel({
        log: function (cb) {
            config.getLastLogFile(function (high) {
                var logCommand = 'tail ' + config.TAIL_LINE + '"' + path.join(__dirname, "../logs/info" + high + ".log") + '"';
                exec(logCommand,
                    { maxBuffer: 5 * 1024 * 1024 },
                    function (err, stdout) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, stdout.toString());
                    });
            });
        },
        clients: function (cb) {
            workflowService.getClients({}, function (err, clients) {
                if (err) {
                    cb(err);
                    return;
                }
                cb(null, _.map(clients, function (c) {
                    return c.toObject({getters: true, virtuals: true });
                }));
            });
        },
        balance: function (cb) {
            crowdFlowerService.getAccountDetails(function (err, details) {
                if (err) {
                    return cb(err);
                }
                cb(null, details.balance || 0);
            });
        }
    }, callback);
}

/**
 * Get status of background service
 * @param {Function} callback the callback function
 */
function getServiceStatus(callback) {
    _createSocketRequest('status', callback);
}

/**
 * Start the background service
 * @param {Function} callback the callback function
 */
function startService(callback) {
    _createSocketRequest('start', callback);
}

/**
 * Stop the background service
 * @param {Function} callback the callback function
 */
function stopService(callback) {
    _createSocketRequest('stop', callback);
}

/**
 * Show log file
 * @param {Function} callback the callback function
 */
function getLogFile(req, res, callback) {
    res.setHeader('Content-disposition', 'attachment; filename=engrafa.log');
    config.getLastLogFile(function (high) {
        var logFile = path.join(__dirname, "../logs/info" + high + ".log");
        res.sendfile(logFile);
    });
}

/**
 * Save workflow configuration
 * @param {Function} callback the callback function
 */
function saveWorkflow(req, callback) {
    var error = validator.validate(req.body, "workflow") ||
        validator.validate({
            clientId: req.query.clientId,
            workflowId: req.query.workflowId
        }, {
            clientId: "objectId",
            workflowId: "objectId"
        });
    if (error) {
        callback(null, {
            ok: false,
            error: error.message
        });
    } else {
        workflowService.updateWorkflow(req.query.clientId, req.query.workflowId, req.body, function (err) {
            callback(err, {ok: true});
        });
    }
}

/**
 * Validate whether task groups are valid
 * @param {Object} req the request object
 * @param {Function} callback the callback function
 */
function validate(req, callback) {
    var error = validator.validate(req.body, "workflow");
    if (error) {
        callback(null, {
            ok: false,
            error: error.message
        });
    } else {
        callback(null, {ok: true});
    }
}

module.exports = {
    getSettings: wrapExpress("Settings#getSettings", getSettings),
    startService: wrapExpress("Settings#startService", startService),
    getServiceStatus: wrapExpress("Settings#getServiceStatus", getServiceStatus),
    stopService: wrapExpress("Settings#stopService", stopService),
    getLogFile: wrapExpress("Settings#getLogFile", getLogFile),
    validate: wrapExpress("Settings#validate", validate),
    saveWorkflow: wrapExpress("Settings#saveWorkflow", saveWorkflow)
};