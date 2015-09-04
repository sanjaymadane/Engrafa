/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the common code.
 *
 * @version 1.0
 * @author TCASSEMBLER
 */

var config = require('./config/config');
var exec = require('child_process').exec;
var _ = require('underscore');
var winston = require('winston');
var async = require('async');

/**
 * Execute the command.
 * @param command the command line text
 * @param skip the skip error flag
 * @param callback the callback function
 */
function executeCommand(command, skip, callback) {
    async.waterfall([
        function (cb) {
            exec(command, cb);
        }
    ], function done(err) {
        if (err) {
            if (skip) {
                // skip the error
                callback(null);
            } else {
                callback(err);
            }
        } else {
            callback(null);
        }
    });
}

/**
 * Stop all instances.
 * @param callback the callback function
 */
function stopAllInstances(callback) {
    async.waterfall([
        function (cb) {
            executeCommand(config.STOP_WORKER_COMMAND, true, cb);
        }, function (cb) {
            setTimeout(function () {
                executeCommand(config.STOP_APP_COMMAND, true, cb);
            }, config.SHUTDOWN_JOB_INTERVAL);
        }, function (cb) {
            setTimeout(function () {
                executeCommand(config.STOP_WEB_SERVER_COMMAND, true, cb);
            }, config.SHUTDOWN_JOB_INTERVAL);

        }, function (cb) {
            executeCommand(config.STOP_ENGRAFA_SERVICE_APP_COMMAND, true, cb);
        }
    ], function done(err) {
        setTimeout(function () {
            if (err) {
                winston.error('failed to stop all instances by forever');
            } else {
                winston.info('successfully stopped all instances by forever');
            }
            callback();
        }, config.SHUTDOWN_JOB_INTERVAL);

    });
}

/**
 * Start all instances.
 * @param callback the callback function.
 */
function startAllInstances(callback) {
    async.waterfall([
        function (cb) {
            executeCommand(config.START_ENGRAFA_SERVICE_APP_COMMAND, false, cb);
        }, function (cb) {
            executeCommand(config.START_WEB_SERVER_COMMAND, false, cb);
        }, function (cb) {
            executeCommand(config.START_WORKER_COMMAND, false, cb);
        }, function (cb) {
            executeCommand(config.START_APP_COMMAND, false, cb);
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to start all instances by forever:' + err);
        } else {
            winston.info('successfully started all instances by forever');
        }
        callback();
    });
}

module.exports = {
    executeCommand: executeCommand,
    stopAllInstances: stopAllInstances,
    startAllInstances: startAllInstances
};