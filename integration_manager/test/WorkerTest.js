/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This demonstrates the backend processing performed by the worker implementation.
 *
 * @version 1.1
 * @author j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
/*global beforeEach, it, describe, afterEach, before, after */
'use strict';

var _ = require('underscore');
var helper = require('../test_files/helper');
var appConfig = require('../../config');
var mongoose = appConfig.getIntegrationManagerMongoose();
var workflowMongoose = appConfig.getWorkflowManagerMongoose();
var expect = require('chai').expect;
var async = require('async');
var runBackgroundJob = require('../worker').job;

var WIC = mongoose.model('WorkflowIntegrationConfiguration',
    require('../models/WorkflowIntegrationConfiguration').WorkflowIntegrationConfigurationSchema);
var TransformedResult = mongoose.model('TransformedResult',
    require('../models/TransformedResult').TransformedResultSchema);

var hookInvoked = false;

if (appConfig.isProd) {
    console.log("  WorkerTest: Tests Skipped - Production Environment");
    process.exit(0);
}

// setup test data
beforeEach(function (done) {
    hookInvoked = false;
    async.waterfall([function (cb) {
        helper.reset(mongoose)(cb);
    },
        function (cb) {
            helper.resetWorkflowData(workflowMongoose)(cb);
        }], done);
});

// cleanup test data
afterEach(function (done) {
    async.waterfall([function (cb) {
        helper.purge(mongoose)(cb);
    },
        function (cb) {
            helper.purgeWorkflowData(workflowMongoose)(cb);
        }], done);
});

// mock web hook server
var webhook = require('../test_files/mockWebhook').createHook(function () {
    hookInvoked = true;
});

describe('Worker', function () {

    // start the mok web hook
    before(function () {
        webhook.listen(helper.HOOK_PORT);
    });

    // terminate the mock web hook
    after(function () {
        webhook.close();
    });

    it('Should extract the xml data directly if no transformations are set up', function (done) {
        runBackgroundJob(function () {
            expect(hookInvoked).to.equal(true);
            TransformedResult.findOne({workUnitId: '2'}, function (err, result) {
                if (err) {
                    return done(err);
                }
                expect(result.fields.length).to.equal(13);
                var matchedFields = 0;
                _.each(result.fields, function (field) {
                    if (field.name === 'validstate' && field.jobName === 'CLASSIFICATION_STATE_BASIC') {
                        expect(field.value).to.equal('Yes');
                        expect(field.confidence).to.equal(1);
                        matchedFields++;
                    } else if (field.name === 'state' && field.jobName === 'CLASSIFICATION_STATE_BASIC') {
                        expect(field.value).to.equal('NE edited');
                        expect(field.confidence).to.equal(1);
                        matchedFields++;
                    } else if (field.name === 'newField' && field.jobName === 'CLASSIFICATION_STATE_BASIC') {
                        expect(field.value).to.equal('NE some suffix');
                        expect(field.confidence).to.equal(-1);
                        matchedFields++;
                    } else if (field.name === 'collectorname' && field.jobName === 'CLASSIFICATION_COLLECTOR_BASIC') {
                        expect(field.value).to.equal('TERRENCE GAFFY');
                        expect(field.confidence).to.equal(1);
                        matchedFields++;
                    } else if (field.name === 'state2' && field.jobName === 'CLASSIFICATION_COLLECTOR_BASIC') {
                        expect(field.value).to.equal('NE edited');
                        expect(field.confidence).to.equal(-1);
                        matchedFields++;
                    } else if (field.name === 'paymentschedule' && field.jobName === 'TAXONOMY_PAYMENTS_BASIC') {
                        expect(field.value).to.equal('four');
                        expect(field.confidence).to.equal(1);
                        matchedFields++;
                    } else if (field.name === 'hasaccountnumber' && field.jobName === 'TAXONOMY_ACCOUNT_NUMBER_BASIC') {
                        expect(field.value).to.equal('Yes');
                        expect(field.confidence).to.equal(1);
                        matchedFields++;
                    } else if (field.name === 'newField' && field.jobName === 'TAXONOMY_ACCOUNT_NUMBER_BASIC') {
                        expect(field.value).to.equal('NE some suffix - suffix 2');
                        expect(field.confidence).to.equal(-1);
                        matchedFields++;
                    } else if (field.name === 'hasaccountnumber' && field.jobName === 'EXTRACTION_ACCOUNT_NUMBER_BASIC') {
                        expect(field.value).to.equal('Yes');
                        expect(field.confidence).to.equal(1);
                        matchedFields++;
                    } else if (field.name === 'accountnumber' && field.jobName === 'EXTRACTION_ACCOUNT_NUMBER_BASIC') {
                        expect(field.value).to.equal('889441');
                        expect(field.confidence).to.equal(1);
                        matchedFields++;
                    }
                });
                expect(matchedFields).to.equal(10);
                done();
            });
        });
    });

    it('Should execute configured transformation rules', function (done) {
        WIC.findOneAndUpdate(
            { workflowId: '544c65d4a892122a42b6f7f0'},
            { $push: {transformationRules: { $each: [
                { rule: 'if (collectorname === "TERRENCE GAFFY") $add.collectorId = "TGAFFY"'}, // add a new field
                { rule: 'if (accountnumber === "889441") $set.paymentschedule = "ANNUAL"'} // change a field value
            ]}}},
            {},
            function (err) {
                if (err) {
                    return done(err);
                }

                runBackgroundJob(function () {
                    expect(hookInvoked).to.equal(true);
                    TransformedResult.findOne({workUnitId: '2'}, function (err, result) {
                        if (err) {
                            return done(err);
                        }

                        expect(result.fields.length).to.equal(14); // one new field should be added
                        var matchedFields = 0;
                        _.each(result.fields, function (field) {
                            if (field.name === 'collectorId') {
                                expect(field.value).to.equal('TGAFFY');
                                matchedFields++;
                            } else if (field.name === 'paymentschedule' && field.jobName === 'TAXONOMY_PAYMENTS_BASIC') {
                                expect(field.value).to.equal('ANNUAL');
                                expect(field.confidence).to.equal(1);
                                matchedFields++;
                            }
                        });
                        expect(matchedFields).to.equal(2);
                        done();
                    });
                });
            }
        );
    });

    it('Should execute configured mapping rules', function (done) {
        WIC.findOneAndUpdate(
            { workflowId: '544c65d4a892122a42b6f7f0'},
            { $push: {mappingRules: { $each: [
                { fieldName: 'paymentschedule', value: 'four', mappedValue: 'ANNUAL'}, // change four to ANNUAL
                { fieldName: 'hasaccountnumber', value: 'Yes', mappedValue: 'true'} // change Yes to true
            ]}}},
            {},
            function (err) {
                if (err) {
                    return done(err);
                }

                runBackgroundJob(function () {
                    expect(hookInvoked).to.equal(true);
                    TransformedResult.findOne({workUnitId: '2'}, function (err, result) {
                        if (err) {
                            return done(err);
                        }
                        expect(result.fields.length).to.equal(13);
                        var matchedFields = 0;
                        _.each(result.fields, function (field) {
                            if (field.name === 'hasaccountnumber') { // should be invoked 2 times because of duplicate
                                expect(field.value).to.equal('true');
                                matchedFields++;
                            } else if (field.name === 'paymentschedule' && field.jobName === 'TAXONOMY_PAYMENTS_BASIC') {
                                expect(field.value).to.equal('ANNUAL');
                                expect(field.confidence).to.equal(1);
                                matchedFields++;
                            }
                        });
                        expect(matchedFields).to.equal(3);
                        done();
                    });
                });
            }
        );
    });
});