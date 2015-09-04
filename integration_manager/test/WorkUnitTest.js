/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 *  This demonstrates API calls to Work Unit calls.
 *
 * @version 1.1
 * @author Shankar Kamble
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
var request = require('supertest');
var app = require('../server').app;

var hookInvoked = false;

if (config.isProd) {
    console.log("  WorkUnitTest: Tests Skipped - Production Environment");
    process.exit(0);
}

// setup test data
beforeEach(function (done) {
    hookInvoked = false;
    helper.reset(mongoose)(done);
});
// cleanup test data
afterEach(helper.purge(mongoose));

// mock web hook server
var webhook = require('../test_files/mockWebhook').createHook(function () {
    hookInvoked = true;
});

describe('WorkUnitController', function () {

    // start the mock web hook
    before(function () {
        webhook.listen(helper.HOOK_PORT);
    });

    // stop the mock web hook
    after(function () {
        webhook.close();
    });

    it('Should return work unit', function (done) {
        request(app)
            .get('/api/workUnit/21668636565')
            .set('Authorization', helper.credentials())
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.statusCode).to.equal(200);
                done();
            });
    });

});