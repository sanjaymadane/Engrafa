/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This service provides methods to CrowdFlower.
 *
 * @version 1.7
 * @author albertwang, Sky_, mln, gfzabarino
 *
 * changes in 1.1:
 * 1. Wrap the api response using _getResponseDelegate method.
 * 2. Add job name to unit result.
 * 3. Add 'input' parameter to createUnit method.
 *
 * changes in 1.2:
 * 1. add new api methods: getJobDetails, getJobPingDetails, getAccountDetails
 *
 * changes in 1.3:
 * 1. add new api method cancelUnit.
 *
 * changes in 1.4:
 * 1. cost is added to task results.
 *
 * changes in 1.5:
 * 1. Handle CrowdFlower 429 errors by waiting and retrying.
 *
 * changes in 1.6:
 * 1. Use RateLimier when calling CrowdFlower API
 *
 * Changes in 1.7:
 * - Updated the configuration file path.
 */
"use strict";

var config = require('../../config');
var request = require('superagent');
var _ = require('underscore');
var async = require('async');
var logging = require('../helpers/logging');
var validator = require('../helpers/validator');
var winston = require('winston');
var jobCache = require('memory-cache');
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(5, 'second');


/**
 * Check for errors from API. If success return response body.
 * @param {Function} callback the callback to wrap
 * @returns {Function} the wrapped function
 * @private
 * @since 1.1
 */
function _getResponseDelegate(callback) {
    return function (err, response) {
        if (err) {
            callback(err);
        } else if (response.error) {
            callback(response.error);
        } else {
            callback(null, response.body);
        }
    };
}

/**
 * This method creates a request which in case of a status error code 429 (Rate limit exceeded) will retry the request again
 * @param {String} method Can be 'get', 'put' or 'post'
 * @param {String} url url to pass as parameter to the selected method
 * @param {Array} [queries] array of queries to add to the request
 * @param {Object} [dataToSend]
 * @param {Function} [cb] callback to be called with an error and response parameters
 * @private
 * @since 1.5
 */
function _request(method, url, queries, dataToSend, cb) {
    limiter.removeTokens(1, function (err) {
        if (err) {
            return cb(err);
        }
        var aRequest = request[method].call(request, url);
        if (queries) {
            queries.forEach(function (query) {
                aRequest.query(query);
            });
        }
        if (dataToSend) {
            aRequest.send(dataToSend);
        }

        aRequest.end(function (err, response) {
            if (err) {
                winston.info('error sending request: %s', url);
                return cb(err);
            }
            if (!response) {
                winston.info('No repsonse for %s %s', method, url);
            }
            var rateLimitStatus = response && response.status === 429;
            winston.info(method + ' ' + url + ' ' + (response && response.status));
            //rate limit shouldn't happen, but wait random time if it does
            if (rateLimitStatus) {
                winston.info('CrowdFlower Rate Limit Exceeded. About to retry: ' + method + ' ' + url);
                // try again after one second
                setTimeout(function () {
                    winston.info('CrowdFlower Rate Limit Exceeded. Retrying now: ' + method + ' ' + url);
                    _request(method, url, queries, dataToSend, cb);
                }, Math.random() * 5000 + 2000); //wait random time between 2s - 7s
            } else {
                if (cb) {
                    cb(err, response);
                }
            }
        });
    });
}

/**
 * Get result of a CrowdFlower unit.
 * @param {Number} jobId the CrowdFlower job ID
 * @param {Number} unitId the CrowdFlower unit ID
 * @param {Function<err, isDone, result>} callback the callback function
 */
function getUnitResult(jobId, unitId, callback) {
    var error = validator.validate({jobId: jobId, unitId: unitId}, {jobId: "Integer", unitId: "Integer"});
    if (error) {
        callback(error);
        return;
    }
    async.waterfall([
        function (cb) {
            async.parallel({
                job: function (cb) {
                    var cachedJob = jobCache.get(jobId);
                    if (cachedJob !== null) {
                        cb(null, cachedJob);
                    } else {
                        _request('get', config.CROWDFLOWER_API_BASE_URL + '/jobs/' + jobId + '.json', [{ key : config.CROWDFLOWER_API_KEY }], null, _getResponseDelegate(function (err, response) {
                            if (!err) {
                                jobCache.put(jobId, response, config.JOB_CACHE_TIMEOUT);
                            }
                            cb(err, response);
                        }));
                    }
                },
                unit: function (cb) {
                    _request('get', config.CROWDFLOWER_API_BASE_URL + '/jobs/' + jobId + '/units/' + unitId + '.json', [{ key : config.CROWDFLOWER_API_KEY }], null, _getResponseDelegate(cb));
                }
            }, cb);
        }, function (results, cb) {
            var job = results.job,
                unit = results.unit;
            if (unit.state === 'finalized') {
                var result = {
                    crowdFlowerJobId : jobId,
                    crowdFlowerJobName : job.title,
                    crowdFlowerUnitId : unitId,
                    judgmentCount : unit.judgments_count,
                    cost: unit.judgments_count * job.payment_cents / job.units_per_assignment,
                    fields : []
                };
                // construct result
                var fields = _.omit(unit.results, 'judgments');
                _.each(fields, function (item, key) {
                    result.fields.push({
                        name : key,
                        value : item.agg,
                        confidence : item.confidence
                    });
                });
                cb(null, true, result);
            } else {
                cb(null, false, null);
            }
        }
    ], callback);
}


/**
 * Create a work unit for given CrowdFlower job.
 * @param {Number} jobId  the CrowdFlower job ID
 * @param {WorkUnit} workUnit the work unit
 * @param {Array} input the list of properties to extract from evaluationContext and send to CF unit
 * @param {Function<err, unitId>} callback the callback function
 */
function createUnit(jobId, workUnit, input, callback) {
    var error = validator.validate({jobId: jobId, workUnit: workUnit}, {jobId: "Integer", workUnit: "WorkUnit"});
    if (error) {
        callback(error);
        return;
    }

    var queries = [
        { key : config.CROWDFLOWER_API_KEY },
        'unit[data][url]=' + workUnit.url
    ];

    input.forEach(function (prop) {
        if (workUnit.evaluationContext.hasOwnProperty(prop)) {
            queries.push('unit[data][' + prop + ']=' + workUnit.evaluationContext[prop]);
        }
    });

    _request('post', config.CROWDFLOWER_API_BASE_URL + '/jobs/' + jobId + '/units.json', queries, {}, _getResponseDelegate(function (err, body) {
        if (err) {
            callback(err);
        } else {
            callback(null, body.id);
        }
    }));
}

/**
 * Cancel a work unit for given CrowdFlower job.
 * @param {Number} jobId  the CrowdFlower job ID
 * @param {Number} unitId the work unit ID to remove
 * @param {Function<err>} callback the callback function
 * @since 1.3
 */
function cancelUnit(jobId, unitId, callback) {
    var error = validator.validate({jobId: jobId, unitId: unitId}, {jobId: "Integer", unitId: "Integer"});
    if (error) {
        callback(error);
        return;
    }
    _request('put', config.CROWDFLOWER_API_BASE_URL + '/jobs/' + jobId + '/units/' + unitId + "/cancel.json", [{ key : config.CROWDFLOWER_API_KEY }], {}, _getResponseDelegate(function (err) {
        callback(err);
    }));
}

/**
 * Get the job details from the CrowdFlower API
 * @param {Number} jobId the CrowdFlower job ID
 * @param {Function<err, details>} callback the callback function
 * @since 1.2
 */
function getJobDetails(jobId, callback) {
    var error = validator.validate({jobId: jobId }, {jobId: "Integer"});
    if (error) {
        callback(error);
        return;
    }
    var cachedJob = jobCache.get(jobId);
    if (cachedJob !== null) {
        callback(null, cachedJob);
    } else {
        _request('get', config.CROWDFLOWER_API_BASE_URL + '/jobs/' + jobId + '.json', [{ key : config.CROWDFLOWER_API_KEY }], null, _getResponseDelegate(function (err, response) {
            if (!err) {
                jobCache.put(jobId, response, config.JOB_CACHE_TIMEOUT);
            }
            callback(err, response);
        }));
    }
}

/**
 * Get the job details (ping only) from the CrowdFlower API
 * @param {Number} jobId the CrowdFlower job ID
 * @param {Function<err, details>} callback the callback function
 * @since 1.2
 */
function getJobPingDetails(jobId, callback) {
    var error = validator.validate({jobId: jobId }, {jobId: "Integer"});
    if (error) {
        callback(error);
        return;
    }
    var cachedJob = jobCache.get("P" + jobId);
    if (cachedJob !== null) {
        callback(null, cachedJob);
    } else {
        _request('get', config.CROWDFLOWER_API_BASE_URL + '/jobs/' + jobId + '/ping.json', [{ key : config.CROWDFLOWER_API_KEY }], null, _getResponseDelegate(function (err, response) {
            if (!err) {
                jobCache.put("P" + jobId, response, config.JOB_CACHE_TIMEOUT);
            }
            callback(err, response);
        }));
    }
}

/**
 * Get the account details of current user
 * @param {Function<err, details>} callback the callback function
 * @since 1.2
 */
function getAccountDetails(callback) {
    _request('get', config.CROWDFLOWER_API_BASE_URL + '/account.json', [{ key : config.CROWDFLOWER_API_KEY }], null, _getResponseDelegate(callback));
}


module.exports = {
    getUnitResult: logging.createWrapper(getUnitResult, {input: ["jobId", "unitId"], output: ["isDone", "result"], signature: "CrowdFlowerService#getUnitResult"}),
    createUnit: logging.createWrapper(createUnit, {input: ["jobId", "unitId", "input"], output: ["unitId"], signature: "CrowdFlowerService#createUnit"}),
    cancelUnit: logging.createWrapper(cancelUnit, {input: ["jobId", "unitId"], output: [], signature: "CrowdFlowerService#cancelUnit"}),
    getJobDetails: logging.createWrapper(getJobDetails, {input: ["jobId"], output: ["details"], signature: "CrowdFlowerService#getJobDetails"}),
    getJobPingDetails: logging.createWrapper(getJobPingDetails, {input: ["jobId"], output: ["details"], signature: "CrowdFlowerService#getJobPingDetails"}),
    getAccountDetails: logging.createWrapper(getAccountDetails, {input: [], output: ["details"], signature: "CrowdFlowerService#getAccountDetails"})
};
