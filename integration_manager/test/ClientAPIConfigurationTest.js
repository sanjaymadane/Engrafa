/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This demonstrates API calls to manage client API configurations.
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
    console.log("  ClientAPIConfigurationTest: Tests Skipped - Production Environment");
    process.exit(0);
}

// setup and cleanup test data after each test
beforeEach(helper.reset(mongoose));
afterEach(helper.purge(mongoose));

describe('ClientAPIConfigurationAdminController', function () {
    it('Should create and list configurations', function (done) {
        async.waterfall([
            // add
            function (cb) {
                request(app)
                    .post('/api/clientAPIConfigurations')
                    .set('Authorization', helper.credentials())
                    .send({clientId: 'client1',
                        authenticationKey: 'clientKey',
                        webhooks: [
                            {type: 'result_ready_for_import', url: 'http://localhost/myhook'}
                        ]})
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return cb(err);
                        }
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('clientId', 'client1');
                        expect(res.body).to.have.property('authenticationKey', 'clientKey');
                        expect(res.body).to.have.deep.property('webhooks.length', 1);
                        cb(null);
                    });
            },
            // list
            function (cb) {
                request(app)
                    .get('/api/clientAPIConfigurations')
                    .set('Authorization', helper.credentials())
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return cb(err);
                        }
                        expect(res.body).to.have.property('length', 2);
                        cb();
                    });
            }
        ], done);
    });

    it('Should not allow non unique wekhook type on create', function (done) {
        request(app)
            .post('/api/clientAPIConfigurations')
            .set('Authorization', helper.credentials())
            .send({clientId: 'client1',
                authenticationKey: 'clientKey',
                webhooks: [
                    {type: 'result_ready_for_import', url: 'http://localhost/myhook'},
                    {type: 'result_ready_for_import', url: 'http://localhost/myhook'}
                ]})
            .expect(400, done);
    });

    it('Should not allow bad webhook type on create', function (done) {
        request(app)
            .post('/api/clientAPIConfigurations')
            .set('Authorization', helper.credentials())
            .send({clientId: 'client1',
                authenticationKey: 'clientKey',
                webhooks: [{type: 'hello', url: 'http://localhost/myhook'}]
                })
            .expect(400, done);
    });

    it('Should not allow non array webhook on create', function (done) {
        request(app)
                .post('/api/clientAPIConfigurations')
                .set('Authorization', helper.credentials())
                .send({clientId: 'client1',
                    authenticationKey: 'clientKey',
                    webhooks: {type: 'result_ready_for_import', url: 'http://localhost/myhook'}
                })
                .expect(400, done);
    });

    it('Should delete configurations', function (done) {
        request(app)
            .del('/api/clientAPIConfigurations/544c65d4a892122a42b6f700')
            .set('Authorization', helper.credentials())
            .expect(200, done);
    });

    it('Should fail delete on invalid id', function (done) {
        request(app)
                .del('/api/clientAPIConfigurations/1')
                .set('Authorization', helper.credentials())
                .expect(400, done);
    });

    it('Should ignore delete if record is already deleted', function (done) {
        request(app)
                .del('/api/clientAPIConfigurations/244c65d4a892122a42b6f700')
                .set('Authorization', helper.credentials())
                .expect(200, done);
    });

    it('Should update configurations', function (done) {
        request(app)
            .put('/api/clientAPIConfigurations/544c65d4a892122a42b6f700')
            .set('Authorization', helper.credentials())
            .send({id: '544c65d4a892122a42b6f700',
                clientId: 'client2',
                authenticationKey: 'clientKey2',
                webhooks: [
                    {type: 'result_ready_for_import', url: 'http://localhost/myhook'},
                    {type: 'result_import_failed', url: 'http://localhost/myhook2'}
                ]})
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('id');
                expect(res.body).to.have.property('clientId', 'client2');
                expect(res.body).to.have.property('authenticationKey', 'clientKey2');
                expect(res.body).to.have.deep.property('webhooks.length', 2);
                done(null);
            });
    });

    it('Should not allow non unique webhook type on update', function (done) {
        request(app)
            .put('/api/clientAPIConfigurations/544c65d4a892122a42b6f700')
            .set('Authorization', helper.credentials())
            .send({id: '544c65d4a892122a42b6f700',
                clientId: 'client2',
                authenticationKey: 'clientKey2',
                webhooks: [
                    {type: 'result_ready_for_import', url: 'http://localhost/myhook'},
                    {type: 'result_ready_for_import', url: 'http://localhost/myhook2'}
                ]})
            .expect(400, done);
    });

    it('Should not allow bad webhook type on update', function (done) {
        request(app)
            .put('/api/clientAPIConfigurations/544c65d4a892122a42b6f700')
            .set('Authorization', helper.credentials())
            .send({id: '544c65d4a892122a42b6f700',
                clientId: 'client2',
                authenticationKey: 'clientKey2',
                webhooks: [{type: 'hello', url: 'http://localhost/myhook'}]
                })
            .expect(400, done);
    });

    it('Should not allow non array webhook on update', function (done) {
        request(app)
            .put('/api/clientAPIConfigurations/000c65d4a892122a42b6f700')
            .set('Authorization', helper.credentials())
            .send({id: '544c65d4a892122a42b6f700',
                clientId: 'client2',
                authenticationKey: 'clientKey2',
                webhooks: {type: 'result_ready_for_import', url: 'http://localhost/myhook'}
                })
            .expect(400, done);
    });

    it('Should fail on bad configuration ID', function (done) {
        request(app)
            .put('/api/clientAPIConfigurations/000c65d4a892122a42b6f700')
            .set('Authorization', helper.credentials())
            .send({id : '1',
                clientId: 'client2',
                authenticationKey: 'clientKey2',
                webhooks: [{type: 'result_ready_for_import', url: 'http://localhost/myhook'}]
                })
            .expect(400, done);
    });

    it('Should fail on non existing configuration ID', function (done) {
        request(app)
            .put('/api/clientAPIConfigurations/000c65d4a892122a42b6f700')
            .set('Authorization', helper.credentials())
            .send({id : '000c65d4a892122a42b6f700',
                clientId: 'client2',
                authenticationKey: 'clientKey2',
                webhooks: [{type: 'result_ready_for_import', url: 'http://localhost/myhook'}]
                })
            .expect(404, done);
    });
});