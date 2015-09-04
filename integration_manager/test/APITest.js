/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This demonstrates API calls for integration.
 *
 * @version 1.1
 * @author j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
/*global beforeEach, it, describe, afterEach, before, after */
'use strict';

var helper = require('../test_files/helper');
var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var expect = require('chai').expect;
var async = require('async');
var request = require('supertest');

var app = require('../server').app;

if (config.isProd) {
    console.log("  APITest: Tests Skipped - Production Environment");
    process.exit(0);
}

// setup and cleanup test data
beforeEach(helper.reset(mongoose));
afterEach(helper.purge(mongoose));

var CLIENT_ID = '5433b9d504ab3d832ebf9c0d';
var CLIENT_SECRET = 'clientKey';
var server = require('http').createServer(app);
var agent = require('superagent');

// mock web hook server
var webhook = require('../test_files/mockWebhook').createHook();

describe('APIController', function () {
    // start the mock web hook
    before(function () {
        webhook.listen(helper.HOOK_PORT);
    });

    // stop the mock web hook
    after(function () {
        webhook.close();
    });


    it('Should require authentication based on client data.', function (done) {
        request(app)
            .get('/api/api/results')
            .set('Authorization', helper.credentials())
            .expect(401, done);
    });

    it('Should return all data for client by default.', function (done) {
        request(app)
            .get('/api/api/results')
            .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                // test data has 3 records, only 2 for this client
                expect(res.body).to.have.property('length', 2);
                done();
            });
    });

    it('Should filter by status.', function (done) {
        request(app)
            .get('/api/api/results?status=ready_for_import')
            .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('length', 1);
                expect(res.body[0]).to.have.property('id', '6433b9d504ab3d832ebf9c0e');
                done();
            });
    });

    it('Should filter by workUnitId.', function (done) {
        request(app)
            .get('/api/api/results?workUnitId=544c65d4a892122a42b6f7f1')
            .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('length', 1);
                expect(res.body[0]).to.have.property('id', '5433b9d504ab3d832ebf9c0e');
                done();
            });
    });

    it('Should filter by workflowId.', function (done) {
        request(app)
            .get('/api/api/results?workflowId=644c65d4a892122a42b6f7f0')
            .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('length', 1);
                expect(res.body[0]).to.have.property('id', '6433b9d504ab3d832ebf9c0e');
                done();
            });
    });

    it('Should match the specification JSON format for transformed result', function (done) {
        request(app)
            .get('/api/api/results?workflowId=644c65d4a892122a42b6f7f0')
            .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body[0]).to.have.property('id', '6433b9d504ab3d832ebf9c0e');
                expect(res.body[0]).to.have.property('clientId', '5433b9d504ab3d832ebf9c0d');
                expect(res.body[0]).to.have.property('clientName', 'test client');
                expect(res.body[0]).to.have.property('workUnitId', '644c65d4a892122a42b6f7f1');
                expect(res.body[0]).to.have.property('workflowId', '644c65d4a892122a42b6f7f0');
                expect(res.body[0]).to.have.property('status', 'ready_for_import');
                expect(res.body[0]).to.have.property('fields');
                expect(res.body[0].fields[0]).to.have.property('name', 'state');
                expect(res.body[0].fields[0]).to.have.property('value', 'Yes');
                expect(res.body[0].fields[0]).to.have.property('confidence', 1);
                expect(res.body[0].fields[0]).to.have.property('jobName', 'CLASSIFICATION_STATE_BASIC');
                expect(res.body[0].fields[0]).to.have.property('importFailed', false);
                expect(res.body[0].fields[0]).to.have.property('errorMessage', 'test');
                expect(res.body[0].fields[0]).not.to.have.property('id');
                done();
            });
    });

    it('Should update transformation statuses.', function (done) {
        async.series([function (cb) {
            // send 3 status, 1 is for a different client, 1 import fails, 1 succeeds
            request(app)
                .post('/api/api/resultImportStatuses')
                .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
                .send([
                    { id: '7433b9d504ab3d832ebf9c0e', succeeded: true, failedFields: [] }, // should fail
                    { id: '5433b9d504ab3d832ebf9c0e', succeeded: true, failedFields: [] },
                    { id: '6433b9d504ab3d832ebf9c0e', succeeded: false, failedFields: [
                        { name: 'state', errorMessage: 'invalid'}
                    ] }
                ])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    expect(res.body.notUpdatedImportStatuses).to.have.property('length', 1);
                    expect(res.body.notUpdatedImportStatuses[0]).to.have.property('id', '7433b9d504ab3d832ebf9c0e');
                    cb();
                });
        }, function (cb) {
            // check the result for the successful import
            request(app)
                .get('/api/api/results?workflowId=544c65d4a892122a42b6f7f0')
                .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    expect(res.body[0]).to.have.property('status', 'import_succeeded');
                    cb();
                });
        }, function (cb) {
            // check the result for the failed import
            request(app)
                .get('/api/api/results?workflowId=644c65d4a892122a42b6f7f0')
                .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    expect(res.body[0]).to.have.property('status', 'import_failed');
                    cb();
                });
        }], done);
    });

});

// for XML, we will use superagent because supertest
describe('APIController - XML format', function () {
    before(function () {
        server.listen(4444);
        webhook.listen(helper.HOOK_PORT);
    });

    after(function () {
        server.close();
        webhook.close();
    });

    it('Should match the specification XML format for transformed result.', function (done) {
        agent.get('http://localhost:4444' + '/api/api/results?workflowId=644c65d4a892122a42b6f7f0')
            .buffer(false)
            .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
            .set('Accept', 'application/xml')
            .end()
            .parse(helper.parseXML(function (res) {
                var xml = res.body;
                expect(res.statusCode).to.equal(200);
                var result = xml.find('//Result')[0];
                expect('application/xml').to.equal('application/xml');
                expect('6433b9d504ab3d832ebf9c0e').to.equal(result.attr('id').value());
                expect('5433b9d504ab3d832ebf9c0d').to.equal(result.attr('clientId').value());
                expect('test client').to.equal(result.attr('clientName').value());
                expect('644c65d4a892122a42b6f7f1').to.equal(result.attr('workUnitId').value());
                expect('644c65d4a892122a42b6f7f0').to.equal(result.attr('workflowId').value());
                expect('ready_for_import').to.equal(result.attr('status').value());
                var field = xml.find('//Field')[0];
                expect('state').to.equal(field.attr('name').value());
                expect('Yes').to.equal(field.attr('value').value());
                expect('1').to.equal(field.attr('confidence').value());
                expect('CLASSIFICATION_STATE_BASIC').to.equal(field.attr('jobName').value());
                expect('false').to.equal(field.attr('importFailed').value());
                expect('test').to.equal(field.attr('errorMessage').value());
                done();
            }));
    });

    it('Should support XML format for non updated statuses.', function (done) {
        agent.post('http://localhost:4444' + '/api/api/resultImportStatuses')
            .set('Authorization', helper.token(CLIENT_ID, CLIENT_SECRET))
            .set('Accept', 'application/xml')
            .send([
                { id: '7433b9d504ab3d832ebf9c0e', succeeded: true, failedFields: [] }, // should fail
                { id: '5433b9d504ab3d832ebf9c0e', succeeded: true, failedFields: [] },
                { id: '6433b9d504ab3d832ebf9c0e', succeeded: false, failedFields: [
                    { name: 'state', errorMessage: 'invalid'}
                ] }
            ])
            .end()
            .parse(helper.parseXML(function (res) {
                var xml = res.body;
                expect(res.statusCode).to.equal(200);
                var result = xml.find('//NotUpdatedImportStatus');
                expect(result).to.have.property('length', 1);
                expect('7433b9d504ab3d832ebf9c0e').to.equal(result[0].attr('id').value());
                done();
            }));
    });
});