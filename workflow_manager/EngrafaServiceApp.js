/*
 * Copyright (C) 2014-2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the startup script for Engrafa Service.
 * This script is supposed to be started using Node.js "forever" CLI module.
 *
 * @version 1.4
 * @author albertwang, Sky_, TCASSEMBLER
 *
 * changes in 1.1:
 * 1. Use multiple files for logging (one for each level).
 * 2. Handle uncaughtException event and log error to winston.
 * 3. Add new job for refreshing Box access_token.
 *
 * changes in 1.2:
 * 1. Add ability to stop/run service using the socket.io module.
 * 2. Wrap all jobs to startAllJobs methods.
 * 3. Only one job with given signature can be on the same time.
 *
 * changes in 1.3:
 * 1. add Jobs for ESCALATION and REVIEW.
 *
 * Changes in v1.4:
 *  Add listener before exit.
 */
"use strict";

var io = require('socket.io')();
var _ = require('underscore');
var boxService = require("./services/BoxService");
var workflowService = require("./services/WorkflowService");
var WorkUnitProcessingPhase = require("./models/WorkUnitProcessingPhase");
var config = require('../config');
var winston = require('winston');
var logging = require('./helpers/logging');

//debug level is not logged to the console, because it is not readable
//log everything to file
winston.add(winston.transports.File, { filename: 'logs/debug.log', level: 'debug', json: false, maxsize: config.LOG_MAX_FILE_SIZE });
//split logs per level log
winston.transports.File.prototype.name = "file_info";
winston.add(winston.transports.File, { filename: 'logs/info.log', level: 'info', json: false, maxsize: config.LOG_MAX_FILE_SIZE });
winston.transports.File.prototype.name = "file_errors";
winston.add(winston.transports.File, { filename: 'logs/error.log', level: 'error', json: false, maxsize: config.LOG_MAX_FILE_SIZE });

//handle all unexpected errors
process.on('uncaughtException', function (error) {
    logging.logError("uncaughtException", error);
    logging.logError("uncaughtException", "Exiting process");
    //exit process end forever will restart program
    process.exit(0);
});

/**
 * The flag whether service is running.
 */
var isRunning = true;

/***
 * The map with jobs currently in progress.
 */
var runningJobs = {};

/**
 * Execute function in given interval.
 * @param {String} signature the signature used for logging
 * @param {Function} fn the function to execute
 * @param {Number} timeout the timeout between schedules
 * @param {Boolean} isNew the flag whether job is new or it is next tick
 */
function startJob(signature, fn, timeout, isNew) {
    if (runningJobs[signature] && isNew) {
        //same job currently in progress
        return;
    }
    if (!isRunning) {
        delete runningJobs[signature];
        return;
    }
    runningJobs[signature] = true;
    var repeat = startJob.bind(null, signature, fn, timeout, false);
    var start = new Date().getTime();
    winston.debug("START: " + signature);
    fn(function (err) {
        if (err) {
            logging.logError(signature, err);
        }
        var end = new Date().getTime();
        winston.debug("END: " + signature + " time=" + (end - start) / 1000 + "s");
        setTimeout(repeat, timeout);
    });
}
// Add listener before exit.
process.on('SIGINT', function () {
    isRunning = false;

    setTimeout(function () {
        process.exit();
    }, config.SHUTDOWN_JOB_INTERVAL);
});

/**
 * Start all jobs
 * @since 1.2
 */
function startAllJobs() {
    startJob("JOB BoxService#pullNewFiles", boxService.pullNewFiles,
        config.PULL_NEW_FILES_JOB_INTERVAL, true);

    startJob("JOB WorkUnitProcessingPhase#processWorkUnits (CLASSIFICATION)",
        workflowService.processWorkUnits.bind(null, WorkUnitProcessingPhase.CLASSIFICATION),
        config.CLASSIFICATION_JOB_INTERVAL, true);

    startJob("JOB WorkUnitProcessingPhase#processWorkUnits (TAXONOMY)",
        workflowService.processWorkUnits.bind(null, WorkUnitProcessingPhase.TAXONOMY),
        config.TAXONOMY_JOB_INTERVAL, true);

    startJob("JOB WorkUnitProcessingPhase#processWorkUnits (EXTRACTION)",
        workflowService.processWorkUnits.bind(null, WorkUnitProcessingPhase.EXTRACTION),
        config.EXTRACTION_JOB_INTERVAL, true);

    startJob("JOB WorkUnitProcessingPhase#processWorkUnits (REVIEW)",
        workflowService.processWorkUnits.bind(null, WorkUnitProcessingPhase.REVIEW),
        config.REVIEW_JOB_INTERVAL, true);

    startJob("JOB WorkUnitProcessingPhase#processWorkUnits (ESCALATION)",
        workflowService.processWorkUnits.bind(null, WorkUnitProcessingPhase.ESCALATION),
        config.ESCALATION_JOB_INTERVAL, true);

    startJob("JOB WorkUnitProcessingPhase#fetchWorkUnitResults", workflowService.fetchWorkUnitResults,
        config.FETCH_RESULTS_JOB_INTERVAL, true);

    startJob("JOB BoxService#refreshAccessToken", boxService.refreshAccessToken,
        config.REFRESH_TOKEN_JOB_INTERVAL, true);
}

//start by default on startup
winston.info('MetaTasker Worfklow Manager started');
startAllJobs();


//listen for new connection
io.on('connection', function (socket) {
    winston.info("IO: new connection");
    //stop service
    socket.on("stop", function (data) {
        var id = data ? data.id : -1;
        winston.info("IO: stop");
        isRunning = false;
        socket.emit('OK', {
            id: id,
            status:  _.values(runningJobs).length ? "stopping" : "stopped"
        });
    });
    //start service
    socket.on('start', function (data) {
        var id = data ? data.id : -1;
        winston.info("IO: start");
        isRunning = true;
        startAllJobs();
        socket.emit('OK', {
            id: id,
            status:  "running"
        });
    });
    //get current status
    socket.on('status', function (data) {
        var id = data ? data.id : -1;
        winston.info("IO: status");
        var status = "stopped";
        if (isRunning) {
            status = "running";
        } else if (_.values(runningJobs).length) {
            status = "stopping";
        }
        socket.emit('OK', {
            id: id,
            status:  status
        });
    });
});
io.listen(config.SOCKET_IO_PORT);
