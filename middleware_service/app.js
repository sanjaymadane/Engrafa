/*
 * Copyright (C) 2014-2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the startup script for Middleware.
 *
 * @version 1.3
 * @author Sky_, TCASSEMBLER
 *
 * changes in 1.1:
 * 1. Add refresh access token of BOX  API.
 *
 * Changes in 1.2:
 *  Add listener before exit.
 *
 * Changes in 1.3:
 * - Updated the configuration file path.
 */
"use strict";

var express = require('express');
var winston = require('winston');
var http = require('http');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require('../config');
var boxService = require("./services/BoxService");

var app = express();

app.set('port', config.API_SERVER_PORT);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

var webhookController = require("./controllers/WebhookController");

app.post("/import", webhookController.importResult);

/**
 * Log error
 * @param {String} signature the signature to log
 * @param {Object} error
 * @since 1.1
 */
function logError(signature, error) {
    var objToLog;
    if (error instanceof Error) {
        //stack contains error message
        objToLog = error.stack || error.toString();
    } else {
        objToLog = JSON.stringify(error);
    }
    winston.error(signature, objToLog);
}


/**
 * handle all unexpected errors.
 * @since 1.1
 */
process.on('uncaughtException', function (error) {
    logError("uncaughtException", error);
    logError("uncaughtException", "Exiting process");
    //exit process end forever will restart program
    process.exit(0);
});

/**
 * The flag whether service is running.
 * @since 1.1
 */
var isRunning = true;

/***
 * The map with jobs currently in progress.
 * @since 1.1
 */
var runningJobs = {};

/**
 * Execute function in given interval.
 * @param {String} signature the signature used for logging
 * @param {Function} fn the function to execute
 * @param {Number} timeout the timeout between schedules
 * @param {Boolean} isNew the flag whether job is new or it is next tick
 * @since 1.1
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
            logError(signature, err);
        }
        var end = new Date().getTime();
        winston.debug("END: " + signature + " time=" + (end - start) + "ms");
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
 * @since 1.1
 */
function startAllJobs() {
    startJob("JOB BoxService#refreshAccessToken", boxService.refreshAccessToken,
        config.REFRESH_TOKEN_JOB_INTERVAL, true);
}

//start by default on startup
startAllJobs();

http.createServer(app).listen(app.get('port'), function () {
    winston.info("Express server listening on port", app.get('port'));
});