/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the start / stop instances workflow.
 *
 * @version 1.0
 * @author TCASSEMBLER
 */
var config = require('./config/config');
var exec = require('child_process').exec;
var _ = require('underscore');
var winston = require('winston');
var async = require('async');
var common = require("./common");
var fs = require('fs');

/**
 * Stop workflow manager instances.
 * @param callback the callback function
 */
function stopWorkflow(callback) {
    async.waterfall([
        function (cb) {
            common.executeCommand(config.STOP_ENGRAFA_SERVICE_APP_COMMAND, true, cb);
        }
    ], function done(err) {
        setTimeout(function () {
            if (err) {
                winston.error('failed to stop workflow instance by forever');
            } else {
                winston.info('successfully stopped workflow instance by forever');
            }
            callback();
        }, config.SHUTDOWN_JOB_INTERVAL);

    });
}
/**
 * Stop integration manager instances.
 * @param callback the callback function
 */
function stopIntegration(callback) {
    async.waterfall([
        function (cb) {
            common.executeCommand(config.STOP_WORKER_COMMAND, true, cb);
        }, function (cb) {
            setTimeout(function () {
                common.executeCommand(config.STOP_APP_COMMAND, true, cb);
            }, config.SHUTDOWN_JOB_INTERVAL);
        }, function (cb) {
            setTimeout(function () {
                common.executeCommand(config.STOP_WEB_SERVER_COMMAND, true, cb);
            }, config.SHUTDOWN_JOB_INTERVAL);
        }
    ], function done(err) {
        setTimeout(function () {
            if (err) {
                winston.error('failed to stop integration instances by forever');
            } else {
                winston.info('successfully stopped integration instances by forever');
            }
            callback();
        }, config.SHUTDOWN_JOB_INTERVAL);

    });
}

/**
 * Start workflow manager instances.
 * @param callback the callback function
 */
function startWorkflow(callback) {
    async.waterfall([
        function (cb) {
            common.executeCommand(config.START_ENGRAFA_SERVICE_APP_COMMAND, false, cb);
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to start workflow instance by forever:' + err);
        } else {
            winston.info('successfully started workflow instance by forever');
        }
        callback();
    });
}
/**
 * Start integration manager instances.
 * @param callback the callback function
 */
function startIntegration(callback) {
    async.waterfall([
        function (cb) {
            common.executeCommand(config.START_WEB_SERVER_COMMAND, false, cb);
        }, function (cb) {
            common.executeCommand(config.START_WORKER_COMMAND, false, cb);
        }, function (cb) {
            common.executeCommand(config.START_APP_COMMAND, false, cb);
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to start integration instances by forever:' + err);
        } else {
            winston.info('successfully started integration instances by forever');
        }
        callback();
    });
}

/**
 * Remove tokens.
 * @param callback the callback function
 */
function removeTokens(callback) {
    async.waterfall([
        function (cb) {
            var files = ['../workflow_manager/access_token', '../workflow_manager/refresh_token',
                '../middleware_service/access_token', '../middleware_service/refresh_token'];

            async.each(files, function(file, cb2) {
                fs.unlink(file, cb2);
            }, function(err){
                cb();
            });
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to remove access token:' + err);
        } else {
            winston.info('successfully removed access token');
        }
        callback();
    });
}
/**
 * Print help in console.
 */
function printHelp() {
    console.log('The command should be one of following:');
    console.log(' -- node instances.js stopInstances');
    console.log(' -- node instances.js stopWorkflow');
    console.log(' -- node instances.js stopIntegration');
    console.log(' -- node instances.js startInstances');
    console.log(' -- node instances.js startWorkflow');
    console.log(' -- node instances.js startIntegration');
    console.log(' -- node instances.js removeTokens');
}

/**
 * Run the workflow based on input parameter.
 */
function parseArguments() {
    var args = process.argv.slice(2);
    if (args.length === 1) {
        if (args[0] === 'stopInstances') {
            common.stopAllInstances(function() {});
        } else if (args[0] === 'stopWorkflow') {
            stopWorkflow(function() {});
        } else if (args[0] === 'stopIntegration') {
            stopIntegration(function() {});
        } else if (args[0] === 'startInstances') {
            common.startAllInstances(function() {});
        } else if (args[0] === 'startWorkflow') {
            startWorkflow(function() {});
        } else if (args[0] === 'startIntegration') {
            startIntegration(function() {});
        } else if (args[0] === 'removeTokens') {
            removeTokens(function() {});
        } else {
            printHelp();
        }
    } else {
        printHelp();
    }
}

parseArguments();

