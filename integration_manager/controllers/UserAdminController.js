/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the controller that exposes AJAX actions for user administration.
 *
 * @version 1.1
 * @author albertwang, j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";

var service = require('../services/UserService');
var delegates = require('../helpers/DelegateFactory');
var async = require('async');
var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var User = mongoose.model('User', require('../models/User').UserSchema);
var CONTROLLER = 'UserAdminController';

/**
 * Creates a new user.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) user - the created object
 */
function createUser(req, res, callback) {
    service.createUser(req.body, req.query.password, callback);
}

/**
 * Updates an existing user.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) user - the updated object
 */
function updateUser(req, res, callback) {
    service.updateUser(req.body, callback);
}

/**
 * Removes a user.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeUser(req, res, callback) {
    service.removeUser(req.params.id, delegates.noArgs(callback));
}

/**
 * Updates an existing new user's password.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) user - the updated object
 */
function updateUserPassword(req, res, callback) {
    service.updateUserPassword(req.params.id, req.query.password, callback);
}

/**
 * Retrieves all users.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) users - all existing users
 */
function getUsers(req, res, callback) {
    async.waterfall([
        // get the user object to verify data access
        function (cb) {
            User.findOne({username: req.user}, cb);
        },
        function (user, cb) {
            service.getUsers(
                function (err, users) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user, users);
                }
            );
        },
        function (user, users, cb) {
            var nonAdminUsers;

            if (user && !user.isAdmin) {
                //Return only non-admin user details
                nonAdminUsers = users.filter(function (u) {
                    return !u.isAdmin;
                });
            } else {
                nonAdminUsers = users;
            }

            cb(null, nonAdminUsers);
        }
    ], callback);
}

/**
 * Resets the current user's password
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) user - the updated user object
 */
function resetCurrentUserPassword(req, res, callback) {
    async.waterfall([
        function (cb) {
            User.findOne({username: req.user}, cb);
        },
        function (user, cb) {
            service.updateUserPassword(user.id, req.query.password, cb);
        }
    ], callback);
}

module.exports = {
    createUser: delegates.controller(CONTROLLER, createUser),
    updateUser: delegates.controller(CONTROLLER, updateUser),
    removeUser: delegates.controller(CONTROLLER, removeUser),
    updateUserPassword: delegates.controller(CONTROLLER, updateUserPassword),
    getUsers: delegates.controller(CONTROLLER, getUsers),
    resetCurrentUserPassword: delegates.controller(CONTROLLER, resetCurrentUserPassword)
};
