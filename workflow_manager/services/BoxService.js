/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This service provides methods to access Box.
 *
 * @version 1.6
 * @author albertwang, Sky_, mln, mo.sehsah
 *
 * changes in 1.1:
 * 1. Add taskGroups when create a new WorkUnit.
 * 2. Remove file from public folder after moved to output folder.
 * 3. Get access_token using method config.getWorkflowManagerAccessToken().
 * 4. Cache access_token to file.
 *
 * changes in 1.2:
 * 1. In saveWorkUnitOutput save uploaded xml fileId to unit.resultXMLFileId.
 * 2. Move common code for file uploading to _getUploadResponseDelegate.
 * 3. add updateWorkUnitOutput for updating XML of work unit.
 *
 * changes in 1.3:
 * 1. Add support for multiple clients in pullNewFiles.
 * 2. Don't return created units in pullNewFiles (it's not used anywhere).
 * 3. add _pullNewFileForClient.
 *
 * changes in 1.4:
 * 1. Add fileName and startTime when creating new WorkUnit
 *
 * changes in 1.5:
 * 1. Use RateLimier when calling Box API, handle 429 errors
 *
 * Changes in 1.6:
 * - Updated the configuration file path.
 */
"use strict";


var config = require('../../config');
var fs = require("fs");
var request = require('superagent');
var FormData = require('form-data');
var winston = require('winston');
var _ = require('underscore');
var async = require('async');
var mongoose = config.getMongoose();
var Client = mongoose.model('Client', require('../models/Client').ClientSchema);
var WorkUnit = mongoose.model('WorkUnit', require('../models/WorkUnit').WorkUnitSchema);
var WorkUnitProcessingPhase = require("../models/WorkUnitProcessingPhase");
var logging = require("../helpers/logging");
var validator = require("../helpers/validator");
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(20, 'second');


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
        var aRequest = request[method](config.BOX_API_BASE_URL + url)
            .set('Authorization', 'Bearer ' + config.getWorkflowManagerAccessToken());
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

            //rate limit shouldn't happen, but wait random time if it does
            if (rateLimitStatus) {
                winston.info('Box.com Rate Limit Exceeded. About to retry: ' + method + ' ' + url);
                // try again after one second
                setTimeout(function () {
                    winston.info('Box.com Rate Limit Exceeded. Retrying now: ' + method + ' ' + url);
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
 * Handle errors from Box API response.
 * If operation was successful return json result to the callback.
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
        callback(null, response.body);
    };
}

/**
 * Get result when uploading files to box api (multipart/formdata)
 * @param {Function<err, body>} callback the callback function
 * @return {Function} the wrapped function
 * @private
 * @since 1.2
 */
function _getUploadResponseDelegate(callback) {
    return function (err, httpResponse) {
        if (err) {
            callback(err);
            return;
        }
        var rawResponse = "";
        httpResponse.on("data", function (chunk) {
            rawResponse += chunk;
        });
        httpResponse.on("end", function () {
            //check for errors
            var body;
            try {
                body = JSON.parse(rawResponse);
            } catch (e) {
                callback(e);
                return;
            }
            _getResponseDelegate(callback)(null, {body: body, statusCode: httpResponse.statusCode});
        });
        httpResponse.on('error', function (err) {
            callback(err);
        });
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
        .set('Authorization', 'Bearer ' + config.getWorkflowManagerAccessToken());
}

/**
 * Randomize given file name.
 * file.pdf will become file_<random_number>.pdf, where <random_number> is a 16-digit random number.
 * @param {String} name the file name
 * @returns {string} the new name
 * @private
 */
function _randomizeFileName(name) {
    var idx = name.lastIndexOf('.');
    var randomNum = Math.floor(Math.random()  * 8999999999999999 + 1000000000000000);
    if (idx === -1) {
        return name + "_" + randomNum;
    }
    return name.substring(0, idx) + '_' + randomNum + name.substring(idx);
}

/**
 * Pull new files for specified client and workflow.
 * @param {Object} client the client
 * @param {Object} workflow the workflow
 * @param {Function<err>} callback the callback function,
 * @private
 * @since 1.3
 */
function _pullNewFileForClient(client, workflow, callback) {
    var sig = logging.createSignatureForWorkflow(client, workflow, true);

    async.waterfall([
        function (cb) {
            _request("get", '/folders/' + workflow.input + '/items',
                [{ fields : 'id,name'},
                    { limit : config.BOX_FILE_RETRIEVAL_BATCH_SIZE } ],
                null,
                _getResponseDelegate(cb));
        }, function (result, cb) {
            var items = _.filter(result.entries, function (item) {
                //get only files
                return item.type === "file";
            });

            if (items.length > 0) {
                winston.info('BoxService#pullNewFiles %sFound %d new files', sig, items.length);
            }
            async.forEach(items, function (item, cb) {
                var uploadedFile;
                async.waterfall([
                    function (cb) {
                        //copy to public folder
                        _request("post", '/files/' + item.id + '/copy',
                            [],
                            { parent : { id : config.BOX_PUBLIC_FOLDER_ID}, name : _randomizeFileName(item.name)},
                            _getResponseDelegate(cb));
                    }, function (file, cb) {
                        //make shared_link public
                        _request("put", '/files/' + file.id,
                            [],
                            {shared_link: {access: "open"}},
                            _getResponseDelegate(cb));
                    }, function (file, cb) {
                        uploadedFile = file;
                        //extra insurance
                        if (!file.shared_link) {
                            cb(new Error(sig + 'no shared_link for file: ' + file.id));
                            return;
                        }

                        var startTime = new Date();
                        WorkUnit.create({
                            _id: uploadedFile.id,
                            url: uploadedFile.shared_link.url,
                            fileName: uploadedFile.name,
                            processingPhase: WorkUnitProcessingPhase.CLASSIFICATION,
                            isDone: false,
                            taskGroups: workflow.taskGroups,
                            client: client,
                            workflowId: workflow.id,
                            startTime: startTime,
                            endTime: null,
                            cost: null,
                            evaluationContext: {
                                startTime: startTime,
                                endTime: null
                            }
                        }, cb);
                    }, function (workUnit, cb) {
                        winston.info("%sNew WorkUnit created id=%d", sig, workUnit.id);
                        //remove the file from input folder
                        _request("del", '/files/' + item.id, null, null, _getResponseDelegate(cb));
                    }
                ], function (err) {
                    if (err) {
                        logging.logError(sig + "BoxService#_pullNewFileForClient", err);
                    }
                    //ignore error
                    cb();
                });
            }, cb);
        }
    ], function (err) {
        callback(err);
    });
}


/**
 * Pull new files from Box input folder and create WorkUnit's for the new files (for all clients).
 * @param {Function<err>} callback the callback function
 */
function pullNewFiles(callback) {
    async.waterfall([
        function (cb) {
            Client.find({}, cb);
        }, function (clients, cb) {
            async.forEach(clients, function (client, cb) {
                async.forEach(client.workflows, function (workflow, cb) {
                    _pullNewFileForClient(client, workflow, cb);
                }, cb);
            }, cb);
        }
    ], callback);
}

/**
 * Save output for a work unit to Box output folder.
 * @param {WorkUnit} unit the work unit
 * @param {Function<err>} callback the callback function
 */
function saveWorkUnitOutput(unit, callback) {
    var workflow = unit.workflow;
    async.waterfall([
        function (cb) {
            cb(validator.validate({unit: unit}, {unit: "WorkUnit"}));
        }, function (cb) {
            _request("post", '/files/' + unit.id + '/copy',
                null,
                { parent : { id : workflow.output}},
                _getResponseDelegate(function handleCopyConfilct(err, responsebody) {
                    if (!err) {
                        cb(null, responsebody);
                        return;
                    }

                    //Ignore copy conflict error
                    if (err.status === 409) {
                        err.name = err.context_info.conflicts.name;
                        cb(null, err);
                        return;
                    }
                    cb(err);
                }));
        }, function (file, cb) {
            var filename = config.OUTPUT_FILENAME_PREFIX + file.name + ".xml";
            var form = new FormData();
            form.append("filename", new Buffer(unit.resultXML), {
                filename: filename,
                contentType: 'text/xml'
            });
            form.append("parent_id", workflow.output);
            var params = require('url').parse(config.BOX_UPLOAD_URL);
            var options = {
                path: params.pathname,
                host: params.hostname,
                protocol: params.protocol,
                headers: {'Authorization': 'Bearer ' + config.getWorkflowManagerAccessToken()}
            };
            form.submit(options, _getUploadResponseDelegate(function (err, httpresponse) {
                if (!err) {
                    cb(null, httpresponse);
                    return;
                }

                // Ignore upload conflict error
                if (err.status === 409) {
                    err.total_count = 1;
                    err.entries = [];
                    err.entries[0] = {};
                    err.entries[0].id = err.context_info.conflicts.id;
                    cb(null, err);
                    return;
                }
            }));
        }, function (response, cb) {
            if (!response.total_count) {
                return cb(new Error("Uploaded file not found in response"));
            }
            unit.resultXMLFileId = Number(response.entries[0].id);
            unit.save(cb);
        }/*, function (unit, count, cb) {
            //remove the file from public folder
            _request("del", '/files/' + unit.id, null, null, _getResponseDelegate(cb));
        }*/
    ], function (err) {
        callback(err);
    });
}

/**
 * Update output for a work unit to Box output folder.
 * @param {WorkUnit} unit the work unit
 * @param {Function<err>} callback the callback function
 * @since 1.2
 */
function updateWorkUnitOutput(unit, callback) {
    async.waterfall([
        function (cb) {
            cb(validator.validate({unit: unit}, {unit: "WorkUnit"}));
        }, function (cb) {
            if (!unit.resultXMLFileId) {
                cb(new Error('resultXMLFileId is not set'));
                return;
            }
            _request("get", '/files/' + unit.resultXMLFileId, null, null, _getResponseDelegate(cb));
        }, function (file, cb) {
            var form = new FormData();
            form.append("filename", new Buffer(unit.resultXML), {
                filename: file.name,
                contentType: 'text/xml'
            });
            var params = require('url').parse(config.BOX_UPLOAD_NEW_VERSION_URL.replace('{id}', unit.resultXMLFileId));
            var options = {
                path: params.pathname,
                host: params.hostname,
                protocol: params.protocol,
                headers: {'Authorization': 'Bearer ' + config.getWorkflowManagerAccessToken()}
            };
            form.submit(options, _getUploadResponseDelegate(cb));
        }
    ], function (err) {
        callback(err);
    });
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
            refresh_token: config.getWorkflowManagerRefreshToken()
        })
        .end(_getResponseDelegate(function (err, response) {
            if (err) {
                callback(new Error("Cannot update refresh token. Please generate tokens manually"));
                return;
            }
            config.BOX_ACCESS_TOKEN = response.access_token;
            config.BOX_REFRESH_TOKEN = response.refresh_token;
            fs.writeFileSync('./refresh_token', response.refresh_token, 'utf8');
            fs.writeFileSync('./access_token', response.access_token, 'utf8');
            winston.info("Refresh token updated");
            callback();
        }));
}

module.exports = {
    pullNewFiles: logging.createWrapper(pullNewFiles, {input: [], output: [], signature: "BoxService#pullNewFiles"}),
    saveWorkUnitOutput: logging.createWrapper(saveWorkUnitOutput, {input: ["unit"], output: [], signature: "BoxService#saveWorkUnitOutput"}),
    refreshAccessToken: logging.createWrapper(refreshAccessToken, {input: [], output: [], signature: "BoxService#refreshAccessToken"}),
    updateWorkUnitOutput: logging.createWrapper(updateWorkUnitOutput, {input: ["unit"], output: [], signature: "BoxService#updateWorkUnitOutput"}),
};
