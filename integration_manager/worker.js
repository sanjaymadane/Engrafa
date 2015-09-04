/*
 * Copyright (C) 2014-2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the startup script for Engrafa Integration Manager worker.
 *
 * @version 1.1
 * @author j3_guile, TCSASSEMBLER
 * 
 * Changes in 1.1:
 * 1. Remove lastTimeCheck and get work units if isTransformed is false
 * 2. Remove transformResult if there was an error
 *
 * Changes in 1.2:
 * - Updated the configuration file path.
 */
"use strict";

var resultTransformationService = require('./services/ResultTransformationService');
var webhookService = require('./services/WebhookService');
var config = require('../config');
var async = require('async');
var _ = require('underscore');

var log = require("./helpers/DelegateFactory").getLog();

// Flags whether the worker is running
var isRunning = true;

// The map with jobs currently in progress.
var runningJobs = {};

// local function to start job
var startJob = function (jobId, fn, timeout, isNew) {
    if (runningJobs[jobId] && isNew) {
        //same job currently in progress
        return;
    }
    if (!isRunning) {
        delete runningJobs[jobId];
        return;
    }
    runningJobs[jobId] = true;
    var repeat = startJob.bind(null, jobId, fn, timeout, false);

    var start = new Date().getTime();
    log.debug("START: " + jobId);
    fn(function () {
        var end = new Date().getTime();
        log.debug("END: " + jobId + " time=" + (end - start) + "ms");
        setTimeout(repeat, timeout);
    });
};

// Perform processing of recently completed work units
var job = exports.job = function (callback) {
    async.waterfall([
        // Get completed work units since last run
        function (cb) {
            resultTransformationService.getCompletedWorkUnits(cb);
        },

        // Transform work unit results
        function (workUnits, allUnitsDone) {
            async.eachLimit(workUnits, 20, function (workUnit, unitDone) {
                var transformedResultId;
                async.waterfall([
                    // Extract result
                    function (cb) {
                        resultTransformationService.extractResult(workUnit, cb);
                    },
                    // Transform result
                    function (transformedResult, cb) {
                        transformedResultId = transformedResult.id;
                        resultTransformationService.transformResult(transformedResult, cb);
                    },
                    // Map result
                    function (transformedResult, cb) {
                        resultTransformationService.mapResult(transformedResult, cb);
                    },
                    // Change status
                    function (transformedResult, cb) {
                        transformedResult.status = 'ready_for_import';
                        resultTransformationService.saveTransformedResult(transformedResult, cb);
                    },
                    // Send webhook notification
                    function (transformedResult, cb) {
                        webhookService.notifyWebhook(transformedResult.clientId, 'result_ready_for_import',
                            _.pick(transformedResult, 'id', 'workUnitId', 'workflowId', 'status'), cb);
                    },
                    function (response, cb) {
                        resultTransformationService.updateMapReduceItem(transformedResultId, cb);
                    },
                    function (cb) {
                        resultTransformationService.setTransformed(workUnit.id, cb);
                    }
                ], function (err) {
                    if (err) {
                        log.error('worker#transformResults', err);
                        resultTransformationService.deleteTransformedResultsByWorkUnit(workUnit.id, function () {});
                    }
                    unitDone(null); // ignore errors so all units are processed
                });
            }, allUnitsDone);
        }
    ], function (err) {
        if (err) {
            log.error('worker#transformResults', err);
        }
        if (callback) {
            callback(err);
        }
    });
};

// Add listener before exit
process.on('SIGINT', function () {
    isRunning = false;

    setTimeout(function () {
        process.exit();
    }, config.SHUTDOWN_JOB_INTERVAL);
});

if (!module.parent) {
    log.info('MetaTasker Integration Manager worker started');
    // Schedule jobs if not being run as a library
    startJob('transformResults', job, config.TRANSFORM_RESULTS_JOB_INTERVAL, true);
}