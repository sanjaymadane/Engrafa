/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Use this script to remove all tasks from crowdflower. If the task can't be removed then will be canceled.
 * Sometimes you will need run this script multiple times to remove all jobs completely.
 *
 * @version 1.0
 * @author Sky_
 */
"use strict";

var async = require('async');
var config = require('../../../config');
var request = require('superagent');
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(5, 'second');

/**
 * Check for errors from API. If success return response body.
 * @param {Function} callback the callback to wrap
 * @returns {Function} the wrapped function
 * @private
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
 * Get all jobs
 * @param {Function<err, items>} callback the callback function
 */
function getAllJobs(callback) {
    var page = 1, items = [], hasMore = true;
    async.doWhilst(function (cb) {
        limiter.removeTokens(1, function (err) {
            request.get(config.CROWDFLOWER_API_BASE_URL + '/jobs.json')
                .query({ key : config.CROWDFLOWER_API_KEY, page: page })
                .end(_getResponseDelegate(function (err, result) {
                    if (err) {
                        cb(err);
                        return;
                    }
                    items = items.concat(result);
                    hasMore = result.length !== 0;
                    cb();
                }));
        });
    }, function () {
        page++;
        return hasMore;
    }, function (err) {
        callback(err, items);
    });
}

async.waterfall([
    function (cb) {
        getAllJobs(cb);
    }, function (items, cb) {
        async.forEach(items, function (item, cb) {
            //try to remove or cancel
            console.log("processsing job: " + item.id);
            limiter.removeTokens(2, function (err) {
                async.parallel({
                    remove: function (cb) {
                        request.del(config.CROWDFLOWER_API_BASE_URL + '/jobs/' + item.id)
                            .query({ key : config.CROWDFLOWER_API_KEY })
                            .send({})
                            .end(_getResponseDelegate(cb));
                    },
                    cancel: function (cb) {
                        request.put(config.CROWDFLOWER_API_BASE_URL + '/jobs/' + item.id + "/cancel.json")
                            .query({ key : config.CROWDFLOWER_API_KEY })
                            .send({})
                            .end(_getResponseDelegate(cb));
                    }
                }, function () {
                    cb();
                });
            });
        }, cb);
    }
], function (err) {
    if (err) {
        throw err;
    }
    process.exit(0);
});