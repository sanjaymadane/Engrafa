/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This demonstrates API calls to manage client user calls.
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
var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var expect = require('chai').expect;
var request = require('supertest');
var app = require('../server').app;

var hookInvoked = false;

if (config.isProd) {
    console.log("  ClientUserTest: Tests Skipped - Production Environment");
    process.exit(0);
}

// setup test data
beforeEach(function (done) {
    hookInvoked = false;
    process.env.IS_TEST = true;
    helper.reset(mongoose)(done);
});
// cleanup test data
afterEach(function (done) {
    process.env.IS_TEST = false;
    helper.purge(mongoose)(done);
});

// mock web hook server
var webhook = require('../test_files/mockWebhook').createHook(function () {
    hookInvoked = true;
});

describe('ClientUserAdminController', function () {

    // start the mock web hook
    before(function () {
        webhook.listen(helper.HOOK_PORT);
    });

    // stop the mock web hook
    after(function () {
        webhook.close();
    });

    it('Should return transformation result for same clientId', function (done) {
        request(app)
            .get('/api/transformedResults/5433b9d504ab3d832ebf9c0e')
            .set('Authorization', helper.credentials())
            .expect(404)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });


    it('Should validate id format', function (done) {
        request(app)
            .get('/api/transformedResults/1')
            .set('Authorization', helper.credentials())
            .expect(400, done);
    });

    it('Should return 404 if record does not exist', function (done) {
        request(app)
            .get('/api/transformedResults/111111111111111111111111')
            .set('Authorization', helper.credentials())
            .expect(404, done);
    });

    it('Should NOT return transformation result for different clientId', function (done) {
        request(app)
            .get('/api/transformedResults/5433b9d504ab3d832ebf9c0e')
            .set('Authorization', helper.token('client1', 'client1'))
            .expect(404, done);
    });

    it('Should updated the specified fields, notify the hook and update the status', function (done) {
        request(app)
            .put('/api/transformedResults/5433b9d504ab3d832ebf9c0e')
            .set('Authorization', helper.credentials())
            .send([
                {name: 'validstate', value: 'true'},
                {name: 'state', value: 'NE'}
            ])
            .expect(200)
            .end(function (err, res) {
                _.each(res.body.fields, function (field) {
                    if (field.name === 'validstate') {
                        expect(field.value).to.equal('true');
                    }
                    if (field.name === 'state') {
                        expect(field.value).to.equal('NE');
                    }
                });
                expect(hookInvoked).to.equal(false);
                done();
            });
    });

    it('Should fail if the external hook is not responding', function (done) {
        webhook.close();
        request(app)
            .put('/api/transformedResults/5433b9d504ab3d832ebf9c0e')
            .set('Authorization', helper.credentials())
            .send([
                {name: 'validstate', value: 'true'},
                {name: 'state', value: 'NE'}
            ])
            .expect(500)
            .end(function (err, res) {
                expect(hookInvoked).to.equal(false);
                expect(res.body.message).to.equal('Cannot find the result.');
                webhook.listen(helper.HOOK_PORT, done);
            });
    });

    it('Should update the status of transformedResults', function (done) {
        request(app)
            .put('/api/transformedResultStatus/5433b9d504ab3d832ebf9c0e')
            .set('Authorization', helper.credentials())
            .send([
                {status: 'rejected'}
            ])
            .expect(200)
            .end(function (err, res) {
                expect(hookInvoked).to.equal(false);
                done();
            });
    });

    it('Should return transformation configuration for Document Type', function (done) {
        request(app)
            .get('/api/transformedConfiguration/RETURN')
            .set('Authorization', helper.credentials())
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                _.each(res.body.fields, function (field) {
                    if (field.name === 'DocumentType') {
                        expect(field.displayValue).to.equal('Document Type');
                    }
                    if (field.name === 'AssessorName') {
                        expect(field.displayValue).to.equal('Assessor');
                    }
                });
                done();
            });
    });

});