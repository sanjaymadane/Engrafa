/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the application configurations.
 * This module also provides a utility function to return mongoose instance.
 *
 * @version 1.0
 * @author TCASSEMBLER
 */
"use strict";

var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var currentEnv = process.env.NODE_ENV || 'development';
var isProd = currentEnv === 'production';


/**
 * Returns last log file number.
 * @returns {string} log file number.
 */
function getLastLogFile(cb) {
    var logDir = path.join(__dirname, "./workflow_manager/logs/");
    fs.readdir(logDir, function (err, logFiles) {
        var high = 0;
        if (err) {
            console.log(err);
            return;
        }
        var sufixes = [];
        logFiles.forEach(function (file) {
            if (file.substring(0, 4) === 'info') {
                var num = /\d+/;
                var fileNum = Number(file.match(num));
                sufixes.push(parseInt(fileNum, 10));
            }
        });
        high = Math.max.apply(Math, sufixes);
        if (high === 0) { high = ""; }
        return cb(high);
    });
}


module.exports = {

    //This represents ID of the Box folder for public files.
    BOX_PUBLIC_FOLDER_ID : '2537497243',

    //This represents Box REST API access token.
    BOX_ACCESS_TOKEN : 'liijapX9iQNfZxZjdcY8tzd7wrAQ9fGK',

    //This represents Box REST API refresh token.
    BOX_REFRESH_TOKEN : 'YzviEVOcRGC8sJXI4bQ4WtQxKFBXdHdUvLBMrUabzztgmODWki3WAhyJb7wpxce0',

    //This represents the token URL for Box OAuth2
    BOX_API_OAUTH_TOKEN_URL : 'https://www.box.com/api/oauth2/token',

    //This represents the client id of Box App
    BOX_API_CLIENT_ID : '6k7lmrnw8739j24zcdxpemie96ov4v5x',

    //This represents the client secret of Box App
    BOX_API_CLIENT_SECRET : 'KZVVgwZdSYCstNYmuXpjwD8AL8vJZHRZ',

    //This represents the base URL of Box REST API
    BOX_API_BASE_URL : 'https://api.box.com/2.0',

    //This represents the Box upload file URL
    BOX_UPLOAD_URL : "https://upload.box.com/api/2.0/files/content",

    //This represents the Box upload new version of file URL
    BOX_UPLOAD_NEW_VERSION_URL : "https://upload.box.com/api/2.0/files/{id}/content",

    //This represents the batch size when retrieving Box input files
    BOX_FILE_RETRIEVAL_BATCH_SIZE : 20,

    //This represents the base URL of CrowdFlower REST API
    CROWDFLOWER_API_BASE_URL :  "https://api.crowdflower.com/v1",

    //For Mock CrowdFlower API, use the following (see /services/mock)
    //CROWDFLOWER_API_BASE_URL :  "http://localhost:3000",

    //This represents the API key of CrowdFlower REST API.
    CROWDFLOWER_API_KEY : 'S3stXidDhH-wYkW4ofbN',

    //This represents the file name prefix for output XML files.
    OUTPUT_FILENAME_PREFIX : 'output--',

    //This represents the interval (in milliseconds) for processing work units in classification phase.
    CLASSIFICATION_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for processing work units in taxonomy phase.
    TAXONOMY_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for processing work units in extraction phase.
    EXTRACTION_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for processing work units in review phase.
    REVIEW_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for processing work units in escalation phase.
    ESCALATION_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for fetching results from CrowdFlower.
    FETCH_RESULTS_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for pulling new files from Box.
    PULL_NEW_FILES_JOB_INTERVAL : 10000,

    //This represents the interval (in milliseconds) for refreshing access_token from Box.
    REFRESH_TOKEN_JOB_INTERVAL : 1000 * 60 * 30, //30 min

    //This represents MongoDB connection pool size.
    MONGODB_CONNECTION_POOL_SIZE : 50,

    //The max file size for log file in bytes.
    LOG_MAX_FILE_SIZE:  1024 * 1024 * 10,

    //This represents the limit of DB records to return (page size) in WorkflowService
    PARALLEL_LIMIT: 20,

    //This represents CrowdFlower job url for internal teams.
    INTERNAL_JOB_URL_TEMPLATE: "https://tasks.crowdflower.com/channels/cf_internal/jobs/{job_id}/work?secret={secret}",

    //This represents path to winston log file.
    LOG_FILE_PATH: path.join(__dirname, "./workflow_manager/logs/info.log"),

//    TAIL_LINE: ' -n 50 ', // for linux
    TAIL_LINE: ' ', // for windows

    //This represents shell command for getting the 50 last lines of log.
    TAIL_LOG_COMMAND: 'tail ' + this.TAIL_LINE + '"' + path.join(__dirname, "./workflow_manager/logs/info.log") + '"',

    //This represents the port for socket server.
    SOCKET_IO_PORT: 8661,

    //This represents the url to connect for socket client.
    SOCKET_IO_CLIENT_URL: 'http://localhost:8661',

    //This represents the interval (in milli-seconds) for waiting for response form socket.io server.
    SOCKET_IO_TIMEOUT: 3000,

    //Job Cache Timeout in (in milli-seconds)
    JOB_CACHE_TIMEOUT : 600000, // 10 min

    //This represents the port number for API and frontend pages.
    API_PORT: 3500,

    //Set it to true if a job link must be logged to the console when a new work unit has been created.
    //Useful for testing, copy and paste a link to the browser to complete a job.
    LOG_LINKS_OF_CREATED_JOBS: false,

    //The command for opening the http links. Set it to auto open created units automatically in the browser.
    //LOG_LINKS_OF_CREATED_JOBS must be set to true to use this setting.
    //Every operating system has different command. Refer to http://www.dwheeler.com/essays/open-files-urls.html
    //URL is appended this this command when executing.
    EXEC_JOB_URL_IN_BROWSER_COMMAND: "open",

    //The timeout for EXEC_JOB_URL_IN_BROWSER_COMMAND in milliseconds. Sometime job isn't available and we need to wait
    //few seconds.
    EXEC_JOB_URL_IN_BROWSER_COMMAND_TIMEOUT: 2000,
    // Waiting time before exit process
    SHUTDOWN_JOB_INTERVAL : 10000,

    /**
     * Returns mongoose instance.
     * @returns {Object} the mongoose instance.
     */
    getMongoose: function () {
        return mongoose.createConnection(this.WORKFLOW_MANAGER_MONGODB_TEST_URL,
            { server : { poolSize : this.MONGODB_CONNECTION_POOL_SIZE } });
    },

    /**
     * Get refresh token from cached file (./refresh_token) or from configuration
     * @returns {String} the refresh token
     */
    getWorkflowManagerRefreshToken: function () {
        try {
            return fs.readFileSync('./workflow_manager/refresh_token', 'utf8');
        } catch (e) {
            return this.BOX_REFRESH_TOKEN;
        }
    },

    /**
     * Get access token from cached file (./access_token) or from configuration
     * @returns {String} the refresh token
     * @since 1.1
     */
    getWorkflowManagerAccessToken: function () {
        try {
            return fs.readFileSync('./workflow_manager/access_token', 'utf8');
        } catch (e) {
            return this.BOX_ACCESS_TOKEN;
        }
    },

    getLastLogFile: getLastLogFile,

    /////////////////////////Middleware service config items/////////////////////////////////
    // This represents the port used to serve HTTP server.
    API_SERVER_PORT: 4240,

    // This represents the client id.
    CLIENT_ID: "5433b9d504ab3d832ebf9c0d",

    // This represents the authentication key of the client.
    AUTHENTICATION_KEY: "clientKey",

    // This represents the API Server URL.
    API_SERVER_URL: "http://localhost:4030/api",

    /**
     * Get refresh token from cached file (./refresh_token) or from configuration
     * @returns {String} the refresh token
     */
    getMiddlewareServiceRefreshToken: function () {
        try {
            return fs.readFileSync('./refresh_token', 'utf8');
        } catch (e) {
            return this.BOX_REFRESH_TOKEN;
        }
    },

    /**
     * Get access token from cached file (./access_token) or from configuration
     * @returns {String} the refresh token
     * @since 1.1
     */
    getMiddlewareServiceAccessToken: function () {
        try {
            return fs.readFileSync('./access_token', 'utf8');
        } catch (e) {
            return this.BOX_ACCESS_TOKEN;
        }
    },

    // This represents the WSDL url of soap server.
    SOAP_WSDL_URL: 'http://localhost:5050/DocumentIntegration?wsdl',
    // SOAP_WSDL_URL: 'https://dituat.pt.duffandphelps.com/DocumentIntegration.svc?wsdl',

    // This represents the method name for SOAP service.
    SOAP_METHOD_NAME: "SubmitDocument",

    // This represents the request param name for SOAP service.
    SOAP_REQUEST_NAME: "documentXml",

    // This represents the response name for SOAP service.
    SOAP_RESPONSE_NAME: "SubmitDocumentResult",

    // This represents the headers to send to soap server.
    SOAP_HEADERS: { "SOAPAction" : "http://tempuri.org/IDocumentIntegration/SubmitDocument", "Content-Type" : "text/xml" },

    // This represents WS Security Credentials
    SOAP_SECURITY_USER: 'user1',
    SOAP_SECURITY_PASSWORD: 'user1',


    //////////////////////////////////////////////////////////

    // This represents the MongoDB URL.
    INTEGRATION_MANAGER_MONGODB_URL: 'mongodb://127.0.0.1:27017/engrafaim',

    // This represents the MongoDB URL for the test suite.
    INTEGRATION_MANAGER_MONGODB_TEST_URL: 'mongodb://127.0.0.1:27017/engrafaim-test',

    // This represents the port used to serve HTTPS server for the web UI.
    //
    // null or undefined to disable HTTPS protocol.
    //WEB_SERVER_HTTPS_PORT: 4040,

    // This represents the port used to serve HTTP server for the web UI.
    //
    // If WEB_SERVER_HTTPS_PORT is not null or undefined,
    // all requests to WEB_SERVER_HTTP_PORT will be redirected to WEB_SERVER_HTTPS_PORT.
    WEB_SERVER_HTTP_PORT: 4030,

    // This represents the private key file for HTTPS server.
    WEB_SERVER_HTTPS_PRIVATE_KEY_FILE: 'etc/key.pem',

    // This represents the certificate file for HTTPS server.
    WEB_SERVER_HTTPS_CERTIFICATE_FILE: 'etc/cert.pem',

    // This represents the certificate file in PKCS 12 format for HTTPS server.
    WEB_SERVER_HTTPS_PFX_FILE: null,

    // This represents the port used to serve HTTP server for the REST APIs.
    INTEGRATION_MANAGER_API_SERVER_PORT: 4140,

    // This represents the MongoDB URL of Workflow Manager.
    WORKFLOW_MANAGER_MONGODB_URL: 'mongodb://127.0.0.1:27017/engrafa',

    // This represents the MongoDB URL for the test suite of Workflow Manager.
    WORKFLOW_MANAGER_MONGODB_TEST_URL: 'mongodb://127.0.0.1:27017/engrafa-test',

    // This represents Workflow Manager MongoDB connection pool size.
    WORKFLOW_MANAGER_MONGODB_CONNECTION_POOL_SIZE: 5,

    // This represents the interval (in milliseconds) for transforming Workflow
    TRANSFORM_RESULTS_JOB_INTERVAL: 300000,

    // The directory the reports reside in.
    REPORTS_DIRECTORY: 'reports',

    // Flag indicating whether or not we're in a Production Environment
    isProd: isProd,

    // Stores Authentication Key
    AUTHENTICATION_SESSION_SECRET: 'keyboard cat',

    /**
     * Returns mongoose instance.
     * @returns {Object} the mongoose instance.
     */
    getIntegrationManagerMongoose: function () {
        var dbUrl = this.INTEGRATION_MANAGER_MONGODB_TEST_URL;

        if (isProd) {
            dbUrl = this.INTEGRATION_MANAGER_MONGODB_URL;
        }

        return mongoose.createConnection(dbUrl,
            { server: { poolSize: this.MONGODB_CONNECTION_POOL_SIZE } });
    },

    /**
     * Returns mongoose instance connected to the workflow manager database.
     * @returns {Object} the mongoose instance.
     */
    getWorkflowManagerMongoose: function () {
        var dbUrl = this.WORKFLOW_MANAGER_MONGODB_TEST_URL;

        if (isProd) {
            dbUrl = this.WORKFLOW_MANAGER_MONGODB_URL;
        }

        return mongoose.createConnection(dbUrl,
            { server: { poolSize: this.WORKFLOW_MANAGER_MONGODB_CONNECTION_POOL_SIZE } });
    }
};

/**
 * Assigns last log file to TAIL_LOG_COMMAND var.
 */
getLastLogFile(function (high) {
    var exports = module.exports;
    var command = 'tail ' + exports.TAIL_LINE + '"' + path.join(__dirname, "./workflow_manager/logs/info" + high + ".log") + '"';
    exports.TAIL_LOG_COMMAND = command;
});
