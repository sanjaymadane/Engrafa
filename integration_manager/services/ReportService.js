/*
 * Copyright (C) 2014, 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This service provides methods to manage reoports.
 * 
 * @version 1.1
 * @author sgodwin424
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
/*global beforeEach, it, describe, afterEach, loadReport */
'use strict';

var SERVICE = 'ReportService';

var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');
var delegates = require('../helpers/DelegateFactory');
var config = require('../../config');
var domain = require('domain');
var mongoose = config.getIntegrationManagerMongoose();
var Report = mongoose.model('Report', require('../models/Report').ReportSchema);
var validator = require("../helpers/validator");

/**
 * Detects all reports within the reports directory.
 *
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) reports - all detected reports (filenames)
 */
function detectReports(callback) {
    fs.readdir(path.join(__dirname, '..', config.REPORTS_DIRECTORY), function (err, files) {
        if (err) {
            return callback(err);
        }

        var fileNames = [ ];

        async.each(files, function (file, callback) {
            fs.stat(path.join(__dirname, '..', config.REPORTS_DIRECTORY, file), function (err, stat) {
                if (err) {
                    return callback(err);
                }

                if (!stat.isDirectory()) {
                    fileNames.push(path.join(__dirname, '..', config.REPORTS_DIRECTORY, file));
                }

                callback();
            });
        }, function (err) {
            callback(err, fileNames);
        });
    });
}

/**
 * Given the filepath to a report, it will determine if the report is valid. If so, the source is returned.
 *
 * @param {String} filePath The file path to the report.
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) valid - is the report valid
 *    3) source - if valid, this is the source
 */
function validateReport(filePath, callback) {
    loadReport(filePath, function (err, source) {
        if (err) {
            return callback(null, false, { });
        }

        if (!_.isString(source.name)) {
            return callback(null, false, { });
        }

        if (!_.isFunction(source.execute)) {
            return callback(null, false, { });
        }

        callback(null, true, source);
    });
}

/**
 * Given the filepath to a report, it will return the source for it.
 *
 * @param {String} filePath The file path to the report.
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) source - if valid, this is the source
 */
function loadReport(filePath, callback) {
    var source;
    var error;

    try {
        source = require(filePath);
    } catch (e) {
        console.log('Report invalid: ' + e);
        error = e;
    }

    delete require.cache[require.resolve(filePath)];

    if (error) {
        callback(error);
    } else {
        callback(null, source);
    }
}

/**
 * Executes a report by filename. It will return with no error on success of execution.
 *
 * @param {String} fileName The filename of the report.
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function executeReport(fileName, callback) {
    Report.findOne({
        fileName: fileName.toLowerCase()
    }, function (err, report) {
        if (err) {
            return callback(err);
        }

        if (!report) {
            return callback({ status: 404, message: 'Report does not exist.' });
        }

        if (report.status === 'EXECUTING') {
            return callback({ status: 400, message: 'Report is already executing.' });
        }

        (function (callback) {
            Report.update({
                fileName: fileName.toLowerCase()
            }, {
                status: 'EXECUTING'
            }, function (err) {
                if (err) {
                    return callback(err);
                }

                validateReport(path.join(__dirname, '..', config.REPORTS_DIRECTORY, fileName), function (err, valid, source) {
                    if (err) {
                        return callback(err);
                    }

                    if (!valid) {
                        return callback({ status: 400, message: 'Report is not valid.' });
                    }
                    var d = domain.create();

                    var fileName = report.name.replace(/\W+/g, '_');

                    d.on('error', function (err) {
                        callback(err);
                    });

                    d.run(function () {
                        source.execute(callback);
                    });
                });
            });
        })(function (err, results) {
            Report.findOne({
                fileName: fileName.toLowerCase()
            }, function (dbErr, report) {
                if (dbErr) {
                    return callback(dbErr);
                }

                if (!report) {
                    return callback({ status: 404, message: 'Report does not exist.' });
                }

                // Report may have been cancelled during execution.

                if (report.status === 'EXECUTING') {
                    if (err) {
                        Report.update({
                            fileName: fileName.toLowerCase()
                        }, {
                            status: 'FAILED',
                            lastExecuted: Date.now()
                        }, function() {
                            callback(err);
                        });
                    } else {
                        Report.update({
                            fileName: fileName.toLowerCase()
                        }, {
                            status: 'COMPLETED',
                            results: results,
                            lastExecuted: Date.now()
                        }, function(err) {
                            callback(err);
                        });
                    }
                }
            });
        });
    });
}

/**
 * Cancels the execution of a report.
 *
 * @param {String} fileName The filename of the report.
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function cancelReport(fileName, callback) {
    Report.findOne({
        fileName: fileName.toLowerCase()
    }, function (err, report) {
        if (err) {
            return callback(err);
        }

        if (!report) {
            return callback({ status: 404, message: 'Report does not exist.' });
        }

        if (report.status !== 'EXECUTING') {
            return callback({ status: 400, message: 'Report is not executing.' });
        }

        Report.update({
            fileName: fileName.toLowerCase()
        }, {
            status: 'FAILED'
        }, function (err) {
            callback(err);
        });
    });
}

/**
 * Updates an existing report.
 * @param {Object} report the report to update
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function updateReport (report, callback) {
    var error = validator.validateObject('report', report);

    if (error) {
        return callback(error);
    }

    Report.findById(report.id, function (err, existingReport) {
        if (err) {
            return callback(err);
        }

        //Only name and description fields can be updated through this service
        _.extend(existingReport, _.pick(report, 'name', 'description'));

        existingReport.save(delegates.spliceArgs(callback, 0));
    });
}

/**
 * Returns the details of an existing report.
 * @param {String} id the id of the report whose details are required
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) report - the report requested
 */
function getReport (id, callback) {
    var error = validator.validateObjectId('id', id);

    if (error) {
        return callback(error);
    }

    Report.findById(id, {
        results: 0
    } , callback);
}

module.exports = {
    detectReports: delegates.service(SERVICE, detectReports, { input: [ ], output: [ 'reports' ] }),
    validateReport: delegates.service(SERVICE, validateReport, { input: [ 'filePath' ], output: [ 'valid', 'source' ]}),
    loadReport: delegates.service(SERVICE, loadReport, { input: [ 'filePath' ], output: [ 'source' ]}),
    executeReport: delegates.service(SERVICE, executeReport, { input: [ 'fileName', ], output: [ ]}),
    cancelReport: delegates.service(SERVICE, cancelReport, { input: [ 'fileName', ], output: [ ]}),
    updateReport: delegates.service(SERVICE, updateReport, { input: [ 'report', ], output: [ ]}),
    getReport: delegates.service(SERVICE, getReport, { input: [ 'id', ], output: ['report']})
};
