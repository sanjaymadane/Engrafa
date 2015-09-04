/*
 * Copyright (C) 2014, 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This service provides methods to manage users.
 *
 * @version 1.1
 * @author albertwang, j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";
var SERVICE = 'UserService';

var _ = require('underscore');
var async = require('async');
var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var User = mongoose.model('User', require('../models/User').UserSchema);
var apacheMd5 = require('apache-md5');


var delegates = require('../helpers/DelegateFactory');
var validator = require("../helpers/validator");

/**
 * Test if the user name and the password are matched.
 * @param {String} username the user name to test
 * @param {String} password the password
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) isCorrectPassword - true if the user name and the password are matched, and false otherwise.
 */
function checkPassword(username, password, callback) {
    User.findOne({ username: username }, 'hashedPassword username isAdmin', function (err, user) {
        if (err) {
            callback(err);
        } else {
            if (user === null || user === undefined) {
                callback(null, false, user);
            } else {
                var isCorrectPassword = user.hashedPassword === apacheMd5(password, user.hashedPassword);
                callback(null, isCorrectPassword, user);
            }
        }
    });
}

/**
 * Creates a new web user.
 * @param {Object} user the user to create
 * @param {String} password the password
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) user - the created user
 */
function createUser(user, password, callback) {
    var error = validator.validateString('password', password);
    if (!error) {
        error = validator.validateObject('user', user);
    }

    if (error) {
        return callback(error);
    }

    async.waterfall([
        // verify username uniqueness
        function (cb) {
            User.findOne({ username: user.username }, function (err, user) {
                if (err) {
                    return cb(err);
                }
                if (user) {
                    return cb(validator.createError('username', 'Username already registered.', user.username));
                }
                cb(null);
            });
        },

        // Create User
        function (cb) {
            user.hashedPassword = apacheMd5(password);
            User.create(delegates.noIds(user), cb);
        }
    ], callback);
}


/**
 * Updates an existing web user.
 * @param {Object} user the user to update
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) user - the updated user
 */
function updateUser(user, callback) {
    var error = validator.validateObject('user', user);
    if (!error) {
        error = validator.validateString('user.username', user.username);
    }

    if (error) {
        return callback(error);
    }


    User.findOne({ username: user.username }, function (err, existingUser) {
        if (err) {
            return callback(err);
        }

        if (!existingUser) {
            return callback({ status: 404, message: 'User not found' });
        }

        _.extend(existingUser, _.pick(user, 'isAdmin', 'clientId'));
        existingUser.save(delegates.spliceArgs(callback, 1));
    });
}

/**
 * Deletes web user.
 * @param {String} id the user id to be deleted
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeUser(id, callback) {
    var error = validator.validateObjectId('id', id);
    if (error) {
        return callback(error);
    }

    async.waterfall([
        // Find User
        function (cb) {
            User.findById(id, cb);
        },

        // Delete User
        function (user, cb) {
            if (user) {
                user.remove(function (err) {
                    return cb(err);
                });
            } else {
                // does not exist, just ignore call
                cb(null);
            }
        },
    ], callback);
}

/**
 * Updates the web user password.
 * @param {String} id the user id to be updates
 * @param {String} password the new password to set
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) user - the updated user
 */
function updateUserPassword(id, password, callback) {
    async.waterfall([
        // Update User
        function (cb) {
            User.findOne({ _id: id }, cb);
        },
        // Save password
        function (user, cb) {
            if (user) {
                user.hashedPassword = apacheMd5(password);
                user.save(delegates.spliceArgs(cb, 1));
            } else {
                cb({ status: 404, message: 'User not found' });
            }
        }
    ], callback);
}

/**
 * Retrieves all users.
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) users - all users
 */
function getUsers(callback) {
    User.find({}, callback);
}

/**
 * Retrieves the user that has the requested user name
 * @param {String} The user name of the user to search for
 * @return {User} The user model if any
 */
function findByName(userName, callback) {
    User.findOne({ username : userName }, callback);
}

module.exports = {
    checkPassword: delegates.service(SERVICE, checkPassword, { input: ["username", "password"], output: ["isCorrectPassword", "user"] }),
    createUser: delegates.service(SERVICE, createUser, { input: ["user", "password"], output: ["user"] }),
    updateUser: delegates.service(SERVICE, updateUser, { input: ["user"], output: ["user"] }),
    removeUser: delegates.service(SERVICE, removeUser, { input: ["id"], output: [] }),
    updateUserPassword: delegates.service(SERVICE, updateUserPassword, { input: ["id", "password"], output: ["user"] }),
    getUsers: delegates.service(SERVICE, getUsers, { input: [], output: ["users"] }),
    findByName: delegates.service(SERVICE, findByName, { input: ["userName"], output: ["user"] })

};
