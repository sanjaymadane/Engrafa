/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the controller that exposes AJAX actions managing reports.
 *
 * @version 1.1
 * @author sgodwin424
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */

'use strict';

var _ = require('underscore');
var async = require('async');
var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var Report = mongoose.model('Report', require('../models/Report').ReportSchema);
var delegates = require('../helpers/DelegateFactory');
var reportService = require('../services/ReportService');
var path = require('path');
var fs = require('fs');

var CONTROLLER = 'ReportsController';

/**
 * Detects and returns all validated reports.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) reports - Array of reports
 * @private
 */
function getReports(req, res, callback) {
    async.waterfall([
        function (callback) {
            reportService.detectReports(callback);
        }, function (reports, callback) {
            async.map(reports, function (report, callback) {
                Report.findOne({
                    fileName: path.basename(report).toLowerCase()
                }, {
                    results: 0 // Do not get the results. There is a separate query for that
                }, function(err, instance) {
                    if (err) {
                        return callback(err);
                    }

                    reportService.validateReport(report, function (err, valid, source) {
                        if (err) {
                            return callback(err);
                        }

                        if (!valid) {
                            return callback();
                        }

                        if (instance) {
                            return callback(null, instance);
                        }

                        //If report instance does not exist, add it
                        var newReport = new Report({
                            fileName: path.basename(report).toLowerCase(),
                            results: '',
                            status: 'UNEXECUTED',
                            name: source.name
                        });

                        newReport.save(function (err, savedReport) {
                            if (err) {
                                return callback(err);
                            }

                            callback(null, savedReport);
                        });
                    });
                });
            }, function (err, reports) {
                if (err) {
                    return callback(err);
                }
                var i;

                for (i = 0; i < reports.length; ++i) {
                    if (!reports[i]) {
                        reports.splice(i, 1);
                        i--;
                    }
                }

                callback(null, reports);
            });
        }
    ], callback);
}

/**
 * Returns the requested reports
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) report - Requested report
 * @private
 */
function getReportDetails(req, res, callback) {
    reportService.getReport(req.params.id, callback);
}

/**
 * Updates the requested report - only the title and description fields (the editable fields for now)
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 * @private
 */
function updateReport(req, res, callback) {
    reportService.updateReport(req.body, callback);
}

/**
 * Executes a report by filename. It will return with no error on success of execution.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 * @private
 */
function executeReport(req, res, callback) {
    if (!_.isString(req.body.fileName)) {
        return callback({status: 400, message: 'Request must contain the filename of the report.'});
    }

    reportService.executeReport(req.body.fileName, callback);
}

/**
 * Cancels the execution of a report.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 * @private
 */
function cancelReport(req, res, callback) {
    if (!_.isString(req.body.fileName)) {
        return callback({status: 400, message: 'Request must contain the filename of the report.'});
    }

    reportService.cancelReport(req.body.fileName, callback);
}

/**
 * Downloads the results of a report.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 * @private
 */
function downloadReport(req, res, callback) {
    Report.findOne({
        fileName: req.params.fileName.toLowerCase()
    }, function (err, report) {
        var filePath,
            fileName;

        if (err) {
            return callback(err);
        }

        if (!report) {
            return callback({ status: 404, message: 'Report does not exist.' });
        }

        //Prepare the filename - replace all non alphanumeric characters with "_"
        fileName = report.name.replace(/\W+/g, '_');

        filePath = path.join(__dirname, '..', config.REPORTS_DIRECTORY, 'execution_results', fileName + '.csv');

        //Check if the file exists
        fs.open(filePath, 'r', function (err, fd) {
            if (err) {
                res.status(404).send({
                    message: 'Requested file does not exist'
                });
            } else {
                res.setHeader('Content-disposition', 'attachment; filename=' + fileName + '.csv');
                res.sendFile(filePath);
            }

            if (fd) {
                fs.close(fd);
            }
        });
    });
}

module.exports = {
    getReports: delegates.controller(CONTROLLER, getReports),
    executeReport: delegates.controller(CONTROLLER, executeReport),
    cancelReport: delegates.controller(CONTROLLER, cancelReport),
    downloadReport: delegates.controller(CONTROLLER, downloadReport),
    getReportDetails: delegates.controller(CONTROLLER, getReportDetails),
    updateReport: delegates.controller(CONTROLLER, updateReport)
};
