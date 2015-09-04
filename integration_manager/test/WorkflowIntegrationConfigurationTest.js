/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This demonstrates API calls to manage workflow integration configurations.
 *
 * @version 1.1
 * @author j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */

/*global beforeEach, it, describe, afterEach */
'use strict';

var helper = require('../test_files/helper');
var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var expect = require('chai').expect;
var async = require('async');
var request = require('supertest');
var app = require('../server').app;

if (config.isProd) {
    console.log("  WorkflowIntegrationConfigurationTest: Tests Skipped - Production Environment");
    process.exit(0);
}

// setup and cleanup test data after each test
beforeEach(function (done) {
    process.env.IS_TEST = true;
    helper.reset(mongoose)(done);
});
afterEach(function (done) {
    process.env.IS_TEST = undefined;
    helper.purge(mongoose)(done);
});

// configuration workflow ID that exists in the test data.
var TEST_WF_ID = '544c65d4a892122a42b6f7f0';

describe('WorkflowIntegrationConfigurationAdminController', function () {
    it('Should list all configurations', function (done) {
        request(app)
            .get('/api/workflowIntegrationConfigurations')
            .set('Authorization', helper.credentials())
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('length', 2);
                done();
            });
    });

    it('Should create a configuration', function (done) {
        request(app)
            .post('/api/workflowIntegrationConfigurations')
            .set('Authorization', helper.credentials())
            .send({workflowId: '544c8a1770f66f535404501f'})
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('id');
                expect(res.body).to.have.property('workflowId', '544c8a1770f66f535404501f');
                done();
            });
    });

    it('Should delete a configuration', function (done) {
        helper.getWicId(mongoose, TEST_WF_ID, function (err, wicId) {
            if (err) {
                return done(err);
            }
            request(app)
                .del('/api/workflowIntegrationConfigurations/' + wicId)
                .set('Authorization', helper.credentials())
                .expect(200, done);
        });
    });

    it('Should fail to delete malformed ID', function (done) {
        request(app)
            .del('/api/workflowIntegrationConfigurations/1')
            .set('Authorization', helper.credentials())
            .expect(400, done);
    });

    it('Should ignore delete of non existing ID', function (done) {
        request(app)
            .del('/api/workflowIntegrationConfigurations/544c8a1770f66f535404501f')
            .set('Authorization', helper.credentials())
            .expect(200, done);
    });

    it('Should add and delete a transformation rule', function (done) {
        helper.getWicId(mongoose, TEST_WF_ID, function (err) {
            if (err) {
                return done(err);
            }

            async.waterfall([
                // add
                function (cb) {
                    request(app)
                        .post('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/transformationRules')
                        .set('Authorization', helper.credentials())
                        .send({rule: 'console.log(context)'})
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }
                            expect(res.body).to.have.property('id');
                            expect(res.body).to.have.property('rule', 'console.log(context)');
                            cb(null, res.body.id);
                        });
                },
                // delete
                function (ruleId, cb) {
                    request(app)
                        .del('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/transformationRules/' + ruleId)
                        .set('Authorization', helper.credentials())
                        .expect(200, cb);
                }
            ], done);
        });
    });

    it('Should add and delete a mapping rule', function (done) {
        helper.getWicId(mongoose, TEST_WF_ID, function (err) {
            if (err) {
                return done(err);
            }

            async.waterfall([
                // add
                function (cb) {
                    request(app)
                        .post('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/mappingRules')
                        .set('Authorization', helper.credentials())
                        .send({fieldName: 'f', value: 'v', mappedValue: 'm'})
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return cb(err);
                            }
                            expect(res.body).to.have.property('id');
                            expect(res.body).to.have.property('fieldName', 'f');
                            expect(res.body).to.have.property('value', 'v');
                            expect(res.body).to.have.property('mappedValue', 'm');
                            cb(null, res.body.id);
                        });
                },
                // delete
                function (ruleId, cb) {
                    request(app)
                        .del('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/mappingRules/' + ruleId)
                        .set('Authorization', helper.credentials())
                        .expect(200, cb);
                }
            ], done);
        });
    });

    it('Should validate invalid ID on delete of mapping rule', function (done) {
        request(app)
            .del('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/mappingRules/1')
            .set('Authorization', helper.credentials())
            .expect(400, done);
    });

    it('Should validate invalid ID on delete of transformation rule', function (done) {
        request(app)
            .del('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/transformationRules/1')
            .set('Authorization', helper.credentials())
            .expect(400, done);
    });

    it('Should ignore delete of non existing mapping rule', function (done) {
        request(app)
            .del('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/mappingRules/544c65d4a892122a42b6f7f0')
            .set('Authorization', helper.credentials())
            .expect(200, done);
    });

    it('Should ignore delete of non existing transformation rule', function (done) {
        request(app)
            .del('/api/workflowIntegrationConfigurations/' + TEST_WF_ID + '/transformationRules/544c65d4a892122a42b6f7f0')
            .set('Authorization', helper.credentials())
            .expect(200, done);
    });

    it('Should return 404 if attempting to delete from non-accessible workflow', function (done) {
        request(app)
            .del('/api/workflowIntegrationConfigurations/544c65d4a892122a42b6f7f1/mappingRules/544c65d4a892122a42b6f7f0')
            .set('Authorization', helper.credentials())
            .expect(404, done);
    });
});