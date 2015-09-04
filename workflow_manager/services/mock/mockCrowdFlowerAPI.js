/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Crowd Flower Mock API Restful API - mockCrowdFlowerAPI.js
 *
 * @version 1.0
 * @author marcosking
 *
 */
"use strict";

var http = require("http");
var restify = require('restify');
var server = restify.createServer({ name: 'my-api' });
var mockAPI = require('./modules/MockAPI.js');
var url = require('url');

var debuglog = true;    //Used to render logs to the console.

// Start the server listening on port 3000
server.listen(3000, function () {
    console.log('%s listening at %s', server.name, server.url);
});

server
    // Allow the use of POST
    .use(restify.fullResponse())
    // Maps req.body to req.params so there is no switching between them
    .use(restify.bodyParser());

/**
 * This is the connections per second throttle per ip.
 * Set burst to 1 and rate to 1 if you want to see the throttle in action.
 */
server.use(restify.throttle({
    burst: 100,
    rate: 50,
    ip: true
    // ,
    // overrides: {
    //   '192.168.1.1': {
    //     rate: 0,        // unlimited
    //     burst: 0
    //   }
    // }
}));

server.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
});

function handleError(err) {
    console.log('Error: ' + JSON.stringify(err, undefined, 4));
}

/**
 * Logs to console if the debuglog boolean is true
 */
function consolelog(message) {
    if (debuglog === true) {
        console.log(message);
    }
}

/**
 * The error handling below is needed or you wont get any middleware indicators
 */
server.on('uncaughtException', handleError);

/**
 * Get the account details of mock user
 */
server.get('/account.json', function (req, res, next) {
    consolelog('get: /account.json');

    mockAPI.getAccount(function (response) {
        res.send(response);
        res.end();
    });

});

server.get('/jobs/:jobId', function (req, res, next) {
    var jobId = req.params.jobId.toString().replace('.json', '');

    consolelog('get: /jobs/' + req.params.jobId.toString());

    mockAPI.getJobDetails(jobId, function (response) {
        res.send(response);
        res.end();
    });
});


/**
 * Get the job details (ping only) from the Mock API
 * @param {Number} jobId the CrowdFlower job ID
 */
server.get('/jobs/:jobId/ping.json', function (req, res, next) {
    var jobId = req.params.jobId.toString();

    consolelog('get: /jobs/' + jobId + '/ping.json');

    mockAPI.getJobPingDetails(jobId, function (response) {
        res.send(response);
        res.end();
    });

});


/**
 * Create a Job and save it into mongodb
 */
server.post('/jobs.json', function (req, res, next) {
    consolelog('post: /jobs.json');
    mockAPI.createJobDocument(req.params.job, function (response) {
        res.send(response);
        res.end();
    });
});

// /**
//  * get all jobs
//  * @param {Number} page the pagination number
//  */
server.get('/jobs.json', function (req, res, next) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    var page = query.page || 1;

    consolelog('get: /jobs.json?page=' + page);

    mockAPI.getJobs(page, function (response) {
        res.send(response);
        res.end();
    });
});

/*
 * This service is just here to satisfy the create-jobs.js call.
 * I'm not sure if it's actually needed, yet...
 */
server.post('/jobs/:jobId/channels', function (req, res, next) {
    consolelog('post: /jobs/' + req.params.jobId + '/channels');
    res.end();
});


/**
 * Create a Unit and save it into mongodb
 */
server.post('/jobs/:jobId/units.json', function (req, res, next) {
    var jobId = req.params.jobId.toString().replace('.json', '');

    consolelog('post: /jobs/' + jobId + '/units.json');

    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    mockAPI.createUnit(jobId, query, function (response) {
        res.send(response);
        res.end();
    });
});

/**
 * Pull Unit details from mongodb
 */
server.get('/jobs/:jobId/units/:unitId', function (req, res, next) {
    var jobId = req.params.jobId.toString();
    var unitId = req.params.unitId.toString().replace('.json', '');

    consolelog('get: /jobs/' + jobId + '/units/' + unitId + '.json');

    mockAPI.getUnit(jobId, unitId, function (response) {
        res.send(response);
        res.end();
    });

});

/**
 * Delete a job
 */
server.del('/jobs/:jobId', function (req, res, next) {
    var jobId = req.params.jobId.toString();
    consolelog('delete: /jobs/' + jobId);

    mockAPI.deleteJob(jobId, function (response) {
        res.send(response);
        res.end();
    });
});

/**
 * Cancel Unit
 */
server.put('/jobs/:jobId/units/:unitId/cancel.json', function (req, res, next) {
    var jobId = req.params.jobId.toString();
    var unitId = req.params.unitId.toString();

    consolelog('put: /jobs/' + jobId + '/units/' + unitId + '/cancel.json');

    //res.send({"error":"You can't cancel a job that hasn't been launched."});
    res.send({"success": "Your job is being canceled."});
    res.end();

});
