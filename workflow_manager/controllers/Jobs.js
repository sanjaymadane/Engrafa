/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
"use strict";

/**
 * Represents Jobs controller
 * @version 1.1
 * @author Sky_
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */

var async = require('async');
var config = require("../../config");
var internalJobs = require("../config/internal-jobs.json");
var wrapExpress = require("../helpers/logging").wrapExpress;
var crowdFlowerService = require("../services/CrowdFlowerService");

/**
 * Get data for internal jobs
 * @param {Function} callback the callback function
 */
function getInternalJobs(callback) {
    async.map(internalJobs, function (job, cb) {
        async.waterfall([
            function (cb) {
                async.parallel({
                    details: function (cb) {
                        crowdFlowerService.getJobDetails(job.jobId, cb);
                    },
                    ping: function (cb) {
                        crowdFlowerService.getJobPingDetails(job.jobId, cb);
                    }
                }, cb);
            }, function (result, cb) {
                var mapped = {
                    phase: job.phase,
                    jobId: job.jobId,
                    title: result.details.title,
                    units: result.ping.all_units,
                    judgements: result.ping.all_judgments,
                    pendingJudgements: result.ping.needed_judgments,
                    workUrl: config.INTERNAL_JOB_URL_TEMPLATE
                        .replace("{job_id}", job.jobId)
                        .replace("{secret}", encodeURIComponent(result.details.secret))
                };
                cb(null, mapped);
            }
        ], cb);
    }, callback);
}

module.exports = {
    getInternalJobs: wrapExpress("Jobs#getInternalJobs", getInternalJobs)
};