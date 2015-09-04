/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This demonstrates API calls to manage users.
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
var request = require('supertest');
var app = require('../server').app;

if (config.isProd) {
    console.log("  UserTest: Tests Skipped - Production Environment");
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

describe('UserAdminController', function () {

    it('Should list all users', function (done) {
        request(app)
            .get('/api/users')
            .set('Authorization', helper.credentials())
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('length', 4);
                done();
            });
    });

    it('Should create user', function (done) {
        request(app)
            .post('/api/users?password=user1')
            .set('Authorization', helper.credentials())
            .set('Content-Type', 'application/json')
            .send({ username: 'user2', clientId: 'clientId2'})
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.body).to.have.property('id');
                expect(res.body).to.have.property('username', 'user2');
                expect(res.body).to.have.property('clientId', 'clientId2');
                expect(res.body).to.have.property('isAdmin', false);
                done();
            });
    });

    it('Should require password', function (done) {
        request(app)
            .post('/api/users')
            .set('Authorization', helper.credentials())
            .set('Content-Type', 'application/json')
            .send({ username: 'user2', clientId: 'clientId2'})
            .expect(400, done);
    });

    it('Should require username', function (done) {
        request(app)
            .post('/api/users?password=test')
            .set('Authorization', helper.credentials())
            .set('Content-Type', 'application/json')
            .send({ username: '', clientId: 'clientId1'})
            .expect(400, done);
    });

    it('Should require clientId', function (done) {
        request(app)
            .post('/api/users?password=test')
            .set('Authorization', helper.credentials())
            .set('Content-Type', 'application/json')
            .send({ username: 'user2', clientId: ''})
            .expect(400, done);
    });

    it('Should disallow duplicate user', function (done) {
        request(app)
            .post('/api/users?password=user1')
            .set('Authorization', helper.credentials())
            .set('Content-Type', 'application/json')
            .send({ username: 'test', clientId: 'clientId1'})
            .expect(400, done);
    });

    it('Should update user', function (done) {
        helper.getUserId(mongoose, 'test', function (err, userId) {
            if (err) {
                return done(err);
            }

            request(app)
                .put('/api/users/' + userId)
                .set('Authorization', helper.credentials())
                .set('Content-Type', 'application/json')
                .send({username: 'test', clientId: 'updatedclientId', isAdmin: true})
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    expect(res.body).to.have.property('clientId', 'updatedclientId');
                    expect(res.body).to.have.property('isAdmin', true);
                    done();
                });
        });
    });

    it('Should validate username on update', function (done) {
        helper.getUserId(mongoose, 'test', function (err, userId) {
            if (err) {
                return done(err);
            }

            request(app)
                .put('/api/users/' + userId)
                .set('Authorization', helper.credentials())
                .set('Content-Type', 'application/json')
                .send({clientId: 'updatedclientId', isAdmin: true})
                .expect(400, done);
        });
    });

    it('Should return 404 if username is not found for update', function (done) {
        helper.getUserId(mongoose, 'test', function (err, userId) {
            if (err) {
                return done(err);
            }

            request(app)
                .put('/api/users/' + userId)
                .set('Authorization', helper.credentials())
                .set('Content-Type', 'application/json')
                .send({username: 'nosuchuser', clientId: 'updatedclientId', isAdmin: true})
                .expect(404, done);
        });
    });

    it('Should update the password', function (done) {
        helper.getUserId(mongoose, 'test', function (err, userId) {
            if (err) {
                return done(err);
            }
            request(app)
                .put('/api/users/' + userId + '/password?password=somepassword')
                .set('Authorization', helper.credentials())
                .expect(200, done);
        });
    });

    it('Should remove the user', function (done) {
        helper.getUserId(mongoose, 'test', function (err, userId) {
            if (err) {
                return done(err);
            }
            console.log('userId:' + userId);
            request(app)
                .del('/api/users/' + userId)
                .set('Authorization', helper.credentials())
                .expect(200, done);
        });
    });

    it('Should ignore delete for non-existing user', function (done) {
        var userId = "54509f4dc8ca553809d610fe";
        request(app)
            .del('/api/users/' + userId)
            .set('Authorization', helper.credentials())
            .expect(200, done);
    });

    it('Should validate user iD format', function (done) {
        var userId = "1";
        request(app)
            .del('/api/users/' + userId)
            .set('Authorization', helper.credentials())
            .expect(400, done);
    });

});