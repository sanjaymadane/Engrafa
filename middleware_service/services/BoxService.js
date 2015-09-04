/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This service provides methods to access Box.
 *
 * @version 1.1
 * @author vvvpig
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";
var winston = require('winston');
var async = require("async");
var fs = require("fs");
var request = require("superagent");
var _ = require('underscore');
var config = require('../../config');
var delegates = require('../helpers/DelegateFactory');
var BOX_SERVICE = 'BoxService';

/**
 * Handle errors from Box API response.
 * If operation was successful return response result to the callback.
 * @param {Function<err, body>} callback the callback function
 * @return {Function} the wrapped function
 * @private
 */
function _getResponseDelegate(callback) {
    return function (err, response) {
        if (err) {
            callback(err);
            return;
        }
        if (response.body.type === "error") {
            callback(response.body);
            return;
        }
        if (response.error) {
            if (response.statusCode === 401) {
                callback(new Error("Invalid Box.com access token (" + response.error.toString() + ")"));
            } else {
                callback(response.error);
            }
            return;
        }
        callback(null, response);
    };
}


/**
 * Init request to Box API
 * @param {String} method the http method
 * @param {String} relativeUrl the request url in relative form
 * @returns {Object} the request
 * @private
 */
function _initBoxRequest(method, relativeUrl) {
    return request[method](config.BOX_API_BASE_URL + relativeUrl)
        .set('Authorization', 'Bearer ' + config.getMiddlewareServiceAccessToken());
}


/**
 * Download file for specified id.
 * @param {String} fileId the file id
 * @param {Function<err>} callback the callback function,
 * @private
 */
function _downloadFile(fileId, callback) {
    async.waterfall([
        function (cb) {
            _initBoxRequest("get", '/files/' + fileId + '/content')
                .end(_getResponseDelegate(cb));
        }, function (response, cb) {
            if (!_.isArray(response.redirects) || response.redirects.length !== 1) {
                cb(new Error("should found redirects in response."));
            } else {
                var url = response.redirects[0];
                winston.info("download file id: %s with url %s", fileId, url);
                //download file from box
                request
                    .get(url)
                    .buffer(true)
                    .parse(function (res, fn) {
                        res.setEncoding('binary');
                        res.data = '';
                        res.on('data', function (chunk) {
                            res.data += chunk;
                        });
                        res.on('end', function () {
                            fn(null, res.data);
                        });
                    })
                    .end(function (err, res) {
                        if (err) {
                            return cb(err);
                        }
                        if (!res.ok) {
                            return cb(new Error("Cannot download the file, status = " + res.status));
                        }
                        cb(null, new Buffer(res.body, 'binary').toString('base64'));
                    });
            }
        }], callback);
}
/**
 * Make request to Box OAuth2 to refresh access token
 * @param {Function<err>} callback the callback function
 */
function refreshAccessToken(callback) {
    request.post(config.BOX_API_OAUTH_TOKEN_URL)
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({
            grant_type: "refresh_token",
            client_id: config.BOX_API_CLIENT_ID,
            client_secret: config.BOX_API_CLIENT_SECRET,
            refresh_token: config.getMiddlewareServiceRefreshToken()
        })
        .end(_getResponseDelegate(function (err, res) {
            if (err) {
                callback(new Error("Cannot update refresh token. Please generate tokens manually"));
                return;
            }
            var response = res.body;
            config.BOX_ACCESS_TOKEN = response.access_token;
            config.BOX_REFRESH_TOKEN = response.refresh_token;
            fs.writeFileSync('./refresh_token', response.refresh_token, 'utf8');
            fs.writeFileSync('./access_token', response.access_token, 'utf8');
            winston.info("Refresh token updated");
            callback();
        }));
}

module.exports = {
    refreshAccessToken: delegates.service(BOX_SERVICE, refreshAccessToken, {input: [], output: []}),
    downloadFile: delegates.service(BOX_SERVICE, _downloadFile, {input: ["fileId"], output: ["result"]})
};
