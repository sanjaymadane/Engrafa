/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
"use strict";

/**
 * Represents Reports controller
 * @version 1.1
 * @author Sky_
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */

var async = require('async');
var _ = require('underscore');
var csv = require('fast-csv');
var config = require("../../config");
var wrapExpress = require("../helpers/logging").wrapExpress;
var crowdFlowerService = require("../services/CrowdFlowerService");
var workflowService = require("../services/WorkflowService");
var Phase = require("../models/WorkUnitProcessingPhase");


/**
 * Get work unit summary aggregated by phase
 * @param {Function<err, items>} callback the callback function
 * @private
 */
function _getWorkUnitSummary(callback) {
    var classification = { phase: Phase.CLASSIFICATION, inProgress: 0, completed: 0 },
        taxonomy = { phase: Phase.TAXONOMY, inProgress: 0, completed: 0 },
        extraction = { phase: Phase.EXTRACTION,  inProgress: 0, completed: 0 };
    async.waterfall([
        function (cb) {
            workflowService.getWorkUnits({}, cb);
        }, function (workUnits, cb) {
            _.each(workUnits, function (unit) {
                if (unit.processingPhase === "CLASSIFICATION") {
                    classification.inProgress += 1;
                    return;
                }
                classification.completed += 1;
                if (unit.processingPhase === "TAXONOMY") {
                    taxonomy.inProgress += 1;
                    return;
                }
                taxonomy.completed += 1;
                if (unit.isDone) {
                    extraction.completed += 1;
                } else {
                    extraction.inProgress += 1;
                }
            });
            cb();
        }
    ], function (err) {
        callback(err, [classification, taxonomy, extraction]);
    });
}

/**
 * Get job data summary
 * @param {Function<err, items>} callback the callback function
 * @private
 */
function _getJobData(callback) {
    async.waterfall([
        function (cb) {
            workflowService.getClients({}, cb);
        }, function (clients, cb) {
            var jobs = [];
            var ids = [];
            _.each(clients, function (c) {
                _.each(c.workflows, function (w) {
                    _.each(w.taskGroups, function (g) {
                        _.each(g.tasks, function (t) {
                            if (ids.indexOf(t.crowdFlowerJobId) === -1) {
                                jobs.push({
                                    id: t.crowdFlowerJobId,
                                    phase: g.processingPhase
                                });
                                ids.push(t.crowdFlowerJobId);
                            }
                        });
                    });
                });
            });
            async.map(jobs, function (job, cb) {
                async.series({
                    details: function (cb) {
                        crowdFlowerService.getJobDetails(job.id, cb);
                    },
                    ping: function (cb) {
                        crowdFlowerService.getJobPingDetails(job.id, cb);
                    }
                }, function (err, result) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, {
                        phase: job.phase,
                        jobId: job.id,
                        title : result.details.title,
                        orderedUnits: result.ping.ordered_units,
                        completedJudgments: result.ping.all_judgments,
                        neededJudgments: result.ping.needed_judgments,
                        taintedJudgments: result.ping.tainted_judgments
                    });
                });
            }, cb);
        }, function (items, cb) {
            //aggregate single phase
            var group = function (phase) {
                var aggregated = {
                    phase: phase,
                    jobId: '-',
                    title: '-',
                    orderedUnits: 0,
                    completedJudgments: 0,
                    neededJudgments: 0,
                    taintedJudgments: 0,
                    items: []
                };
                _.each(items, function (item) {
                    if (item.phase !== phase) {
                        return;
                    }
                    aggregated.orderedUnits += item.orderedUnits;
                    aggregated.completedJudgments += item.completedJudgments;
                    aggregated.neededJudgments += item.neededJudgments;
                    aggregated.taintedJudgments += item.taintedJudgments;
                    aggregated.items.push(item);
                });
                aggregated.items.sort(function (a, b) {
                    return a.jobId - b.jobId;
                });
                return aggregated;
            },
                classification = group(Phase.CLASSIFICATION),
                taxonomy = group(Phase.TAXONOMY),
                extraction = group(Phase.EXTRACTION),
                //combine result into one array
                result = [
                    classification,
                    classification.items,
                    taxonomy,
                    taxonomy.items,
                    extraction,
                    extraction.items
                ];
            delete classification.items;
            delete taxonomy.items;
            delete extraction.items;
            result = _.flatten(result);
            cb(null, result);
        }
    ], callback);
}

function getReport(callback) {
    async.parallel({
        workUnitsSummary: _getWorkUnitSummary//,
        //jobsData: _getJobData
    }, callback);
}

/**
 * Return csv file for work units
 * @param {Object} req the request object
 * @param {Object} res the response object
 * @param {Function} callback the callback function
 */
function getWorkUnitCSV(req, res, callback) {
    var csvStream = csv.createWriteStream({headers: true});
    _getWorkUnitSummary(function (err, items) {
        if (err) {
            return callback(err);
        }
        res.setHeader('Content-disposition', 'attachment; filename=work-units.csv');
        csvStream.pipe(res);
        _.each(items, function (item) {
            csvStream.write({
                "Phase": item.phase,
                "Documents in Progress": item.inProgress,
                "Documents Completed": item.completed
            });
        });
        csvStream.end();
    });
}

/**
 * Return csv file for jobs
 * @param {Object} req the request object
 * @param {Object} res the response object
 * @param {Function} callback the callback function
 */
function getJobsCSV(req, res, callback) {
    var csvStream = csv.createWriteStream({headers: true});
    _getJobData(function (err, items) {
        if (err) {
            return callback(err);
        }
        res.setHeader('Content-disposition', 'attachment; filename=jobs.csv');
        csvStream.pipe(res);
        _.each(items, function (item) {
            csvStream.write({
                "Phase": item.phase,
                "Job ID": item.jobId,
                "Job Title": item.title,
                "Ordered Units": item.orderedUnits,
                "Completed Judgements": item.completedJudgments,
                "Needed Judgements": item.neededJudgments,
                "Tainted Judgements": item.taintedJudgments
            });
        });
        csvStream.end();
    });
}

module.exports = {
    getReport: wrapExpress("Reports#getReport", getReport),
    getWorkUnitCSV: wrapExpress("Reports#getWorkUnitCSV", getWorkUnitCSV),
    getJobsCSV: wrapExpress("Reports#getJobsCSV", getJobsCSV)
};