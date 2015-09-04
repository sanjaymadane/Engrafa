/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Use this script to create all jobs.
 *
 * @version 1.2
 * @author Sky_
 *
 * changes in 1.1:
 * 1. Add review and escalation jobs.
 * 2. Create jobs for client 2 and create rush jobs.
 *
 * Changes in 1.2:
 *  - Merged the insert logic.
 */
"use strict";

var async = require('async');
var fs = require('fs');
var config = require('../../../config');
var request = require('superagent');
var path = require('path');
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(5, 'second');


var testConfig = require("../config");
var helper = require("../helper");
var util = require("util");

var CLIENT_A = testConfig.CLIENT_A;

// Set the required judgments per work unit
// Set it to 2 if you want to test master and expert tasks
var judgments_per_unit = 1;

// Jobs to create
var jobs = [
    // CLIENT A
    {name: "CLASSIFICATION_STATE_BASIC", cml: "classification_state_basic.xml"},
    {name: "TAXONOMY_ACCOUNT_NUMBER_BASIC", cml: "taxonomy_account_number_basic.xml"},
    {name: "EXTRACTION_ACCOUNT_NUMBER_BASIC", cml: "extraction_account_number_basic.xml"}
];

// Output result which will be used for config.js
var output = {
    CLASSIFICATION_STATE_BASIC : null,
    TAXONOMY_ACCOUNT_NUMBER_BASIC : null,
    EXTRACTION_ACCOUNT_NUMBER_BASIC : null
};

var jobOutput = {
    JOBS: output,
};

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


async.forEach(jobs, function (job, cb) {
    async.waterfall([
        function (cb) {
            limiter.removeTokens(1, function (err) {
                request.post(config.CROWDFLOWER_API_BASE_URL + '/jobs.json')
                    .query({ key : config.CROWDFLOWER_API_KEY })
                    .send({
                        job: {
                            title: job.name,
                            auto_order: true,
                            judgments_per_unit: judgments_per_unit,
                            units_per_assignment: 1,
                            max_judgments_per_worker: 999999,
                            max_judgments_per_ip: 999999,
                            instructions: 'Read the instructions below',
                            cml: fs.readFileSync(path.join(__dirname, "../sample_cml/" + job.cml), 'utf8')
                        }
                    })
                    .end(_getResponseDelegate(cb));
            });
        }, function (result, cb) {
            output[job.name] = result.id;
            limiter.removeTokens(1, function (err) {
                request.post(config.CROWDFLOWER_API_BASE_URL + '/jobs/' + result.id + '/channels')
                    .query({ key : config.CROWDFLOWER_API_KEY })
                    .send({
                        channels: ["cf_internal"]
                    })
                    .end(_getResponseDelegate(cb));
            });
        }
    ], function (err) {
        console.log("DONE: " + job.name);
        cb(err);
    });
}, function (err) {
    if (err) {
        throw err;
    }

    console.log(JSON.stringify(jobOutput, null, 4));

    var JOBS = jobOutput.JOBS;

    var clients = [
        {
            name: "ClientA",
            workflows: [
                {
                    name: "Standard",
                    input: CLIENT_A.STANDARD_INPUT,
                    output: CLIENT_A.STANDARD_OUTPUT,
                    taskGroups: [
                        {
                            "processingPhase" : "CLASSIFICATION",
                            "name" : "Property Tax Bill Classification General Task Group",
                            "entryCondition" : "true",
                            "tasks" : [
                                // Basic Tasks
                                {
                                    "entryCondition" : "true",
                                    "crowdFlowerJobId" : JOBS.CLASSIFICATION_STATE_BASIC,
                                    "predecessors" : [],

                                    // Transformation example ($add, $set)
                                    "transformation": {
                                        "exec": [
                                            "if (state) $add.state2 = state + ' - new'",
                                            "if (state) $set.state2 = state2 + ' - edited'"
                                        ]
                                    }
                                }
                            ]
                        },
                        {
                            "processingPhase" : "TAXONOMY",
                            "name" : "Property Tax Bill Taxonomy Task Group",
                            "entryCondition" : "state != null",
                            "tasks" : [
                                //Basic Tasks
                                {
                                    "entryCondition" : "true",
                                    "crowdFlowerJobId" : JOBS.TAXONOMY_ACCOUNT_NUMBER_BASIC,
                                    "predecessors" : [],
                                    "input": ["state", "state_confidence", "state2"],
                                    "transformation": {
                                        "exec": [
                                            "if (hasaccountnumber) $add.newField = 'Prefix - ' + state2"
                                        ]
                                    }
                                }
                            ]
                        },
                        {
                            "processingPhase" : "EXTRACTION",
                            "name" : "Property Tax Bill Extraction - Account Number Task Group",
                            "entryCondition" : "TAXONOMY.hasaccountnumber == 'Yes' || TAXONOMY.paymentschedule == 'one'",
                            "tasks" : [
                                //Basic Tasks
                                {
                                    "entryCondition" : "TAXONOMY.hasaccountnumber == 'Yes'",
                                    "crowdFlowerJobId" : JOBS.EXTRACTION_ACCOUNT_NUMBER_BASIC,
                                    "predecessors" : []
                                }
                            ]
                        }

                        // Other available values for processingPhase:
                        // REVIEW, ESCALATION
                    ]
                }
            ]
        }
    ];

    helper.insertClients(clients);

    console.log('Success to insert data.');
});
