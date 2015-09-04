/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the application configurations.
 * This module also provides a utility function to return mongoose instance.
 *
 * Changes in version 1.1 (Engrafa Document Manager Mock API Challenge):
 * - Add the configuration for connecting to mock EC2 API.
 *
 * @version 1.1
 * @since 1.0
 * @author albertwang, arvind81983, duxiaoyang
 */
"use strict";

var mongoose = require('mongoose');
var fs = require('fs');
var request = require('superagent');
var helper = require('./helper');

module.exports = {
    //This represents the MongoDB URL.
    MONGODB_URL : "mongodb://127.0.0.1:27017/engrafa-dm",

    //This represents MongoDB connection pool size.
    MONGODB_CONNECTION_POOL_SIZE : 50,

    //This represents the base URL of Box View REST API
    BOX_VIEW_API_BASE_URL : 'https://view-api.box.com/1',

    //This represents the base URL of Box Content REST API
    BOX_CONTENT_API_BASE_URL : 'https://api.box.com/2.0',

    //This represents the Box Upload file Url
    BOX_UPLOAD_URL : 'https://upload.box.com/api/2.0/files/content',

    //This represents the token URL for Box OAuth2
    BOX_API_OAUTH_TOKEN_URL : 'https://www.box.com/api/oauth2/token',

    //This represents the client id of Box App
    BOX_API_CLIENT_ID : 'ofx9xlc0n98dkcxlym7fj47150mu0pn5',

    //This represents the client secret of Box App
    BOX_API_CLIENT_SECRET : '44aO9YGC19TG4Sone81sI3Zn4T7xn7ce',

    //This represents Box View API key.
    BOX_VIEW_API_KEY : '749re4fgj8isynrxshw7f1dfzfthxqgs',

    //This represents Box REST API access token.
    BOX_ACCESS_TOKEN : 'T3yNvFIBn09ALQbQKSdI6ihjisxGic8V',

    //This represents Box REST API refresh token.
    BOX_REFRESH_TOKEN : 'rfjhwwuq4tOP7NeHdlteWJ5r8qLBUgdhFPmsAGWwJy1eLTmi8DkcOgauVRws5uGA',

    //This represents the batch size when retrieving Box input files
    BOX_FILE_RETRIEVAL_BATCH_SIZE : 20,

    //This represents the TTL (time-to-live) of a document's HTML view URL until it expires, in minutes.
    DOCUMENT_HTML_VIEW_TTL : 10,

    //This represents the directory used to temporarily hold document processing input and output files.
    DOCUMENT_PROCESSING_DIRECTORY : './processing',

    //This represents the port where document processor is running.
    DOCUMENT_PROCESSOR_PORT : '8080',

    //This represents the Document Processor URL suffix, with port and path. e.g. "/processDocument".
    DOCUMENT_PROCESSOR_URL_SUFFIX : '/processDocument',

    //This represents the URL to retrieve latest Trapeze License Usage log. e.g. "/licenseUsageLog".
    CVISION_TRAPEZE_LICENSE_USAGE_LOG_URL_SUFFIX : '/licenseUsageLogs',

    //This represents the port used to serve HTTP server.
    SERVER_PORT : 10000,

    //This represents the maximum workload (concurrently processing document)
    // allowed for a particular Document Processor.
    DOCUMENT_PROCESSOR_MAX_WORKLOAD : 2,

    //This represents the maximum idle time (in milliseconds) of a Document Processor before it is stopped.
    DOCUMENT_PROCESSOR_MAX_IDLE_TIME : 300000,

    //This represents the maximum idle time (in milliseconds) of a Document Processor before it is terminated.
    DOCUMENT_PROCESSOR_MAX_IDLE_TIME_FOR_TERMINATION : 60000,

    //This represents the threshold of queued documents.
    // If this threshold is reached, new Document Processor will be started/launched.
    DOCUMENT_QUEUE_THRESHOLD : 0,

    //This represents the threshold queued document waiting time (in milliseconds),
    // if any document has been in 'QUEUED' status longer than the threshold,
    // a new Document Processor will be started/launched.
    DOCUMENT_QUEUE_WAITING_TIME_THRESHOLD : 10,

    // This represents the Document Processor AWS EC2 launch parameters.
    DOCUMENT_PROCESSOR_EC2 : {
        ImageId: 'ami-d3d991e3', /* required */
        InstanceType: 't1.micro',
        MaxCount: 1, /* required */
        MinCount: 1, /* required */
        SecurityGroups: [
            "launch-wizard-5"
        ]
    },

    //This represents the Region where EC2 instances of document processor are located.
    DOCUMENT_PROCESSOR_EC2_REGION : 'us-west-2',

    //This represents the secret key for EC2 instances of document processor
    DOCUMENT_PROCESSOR_EC2_SECRET_KEY : '2agVlY7Dk7Cc9sCz+DzqbLd2CHcNlhMM2NRsd6qr',

    //This represents the access key for EC2 instances of document processor
    DOCUMENT_PROCESSOR_EC2_ACCESS_KEY : 'AKIAJINNZRPXZWU7DMQA',

    //This represents whether to use mock AWS API.
    DOCUMENT_PROCESSOR_EC2_MOCK : false,

    //This represents the endpoint of mock AWS API. It is used only if DOCUMENT_PROCESSOR_EC2_MOCK is true.
    DOCUMENT_PROCESSOR_EC2_MOCK_ENDPOINT : 'http://localhost:8000/aws-mock/ec2-endpoint/',

    //This represents the interval (in milliseconds) for pulling new documents.
    PULL_NEW_DOCUMENTS_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for processing documents.
    PROCESS_DOCUMENTS_JOB_INTERVAL : 100000,

    //This represents the interval (in milliseconds) for converting documents.
    CONVERT_DOCUMENTS_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for checking document conversions.
    CHECK_DOCUMENT_CONVERSION_STATUS_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for
    //pulling CVision Trapeze license usage logs.
    PULL_CVISION_TRAPEZE_LICENSE_USAGE_LOGS_JOB_INTERVAL : 100000,

    //This represents the interval (in milliseconds) for checking and scaling document processors.
    SCALE_DOCUMENT_PROCESSORS_JOB_INTERVAL : 1000,

    //This represents the interval (in milliseconds) for refreshing Box access token.
    REFRESH_BOX_ACCESS_TOKEN_JOB_INTERVAL : 10000,

    //This represents the directory to store the CVision Trapeze license usage logs.
    CVISION_TRAPEZE_LICENSE_USAGE_LOGS_DIRECTORY : './cvisionlogs',

    //This represents the time (in milliseconds) for keeping the HTTP request alive.
    DOCUMENT_PROCESSOR_KEEPALIVE_TIME : 1200000,

    /**
     * Returns mongoose instance.
     * @returns {Object} the mongoose instance.
     */
    getMongoose: function () {
        return mongoose.createConnection(this.MONGODB_URL,
            { server : { poolSize : this.MONGODB_CONNECTION_POOL_SIZE } });
    },

    /**
     * Get refresh token from cached file (./refresh_token) or from configuration
     * @returns {String} the refresh token
     */
    getBoxRefreshToken: function () {
        try {
            return fs.readFileSync('./refresh_token', 'utf8');
        } catch (e) {
            return this.BOX_REFRESH_TOKEN;
        }
    },

    /**
     * Get access token from cached file (./access_token) or from configuration
     * @returns {String} the access token
     */
    getBoxAccessToken: function () {
        try {
            return fs.readFileSync('./access_token', 'utf8');
        } catch (e) {
            return this.BOX_ACCESS_TOKEN;
        }
    },

    /**
     * Refresh Box access token.
     * @param callback: the callback function
     * @returns None
     */
    refreshBoxAccessToken: function (callback) {
        try {
            var grantType = "refresh_token";
            var refresh_token = this.getBoxRefreshToken();
            request.post(this.BOX_API_OAUTH_TOKEN_URL)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send({
                    grant_type: grantType,
                    client_id: this.BOX_API_CLIENT_ID,
                    client_secret: this.BOX_API_CLIENT_SECRET,
                    refresh_token: refresh_token
                })
                .end(function (err, res) {
                    if (!res || !res.ok) {
                        helper.Log("Cannot update refresh token. Please generate tokens manually");
                    } else {
                        var tokens = JSON.parse(res.text);
                        if (tokens.access_token && tokens.refresh_token) {
                            helper.Log("Refreshed access and refresh token.");
                            fs.writeFileSync('./refresh_token',
                                tokens.refresh_token, 'utf8');
                            fs.writeFileSync('./access_token',
                                tokens.access_token, 'utf8');
                            callback();
                        }
                    }
                });
        } catch (e) {
            callback(e);
        }
    }
};
