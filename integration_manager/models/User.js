/*
 * Copyright (C) 2014, 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents a user in the web application.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;

// Represents a user in the web application.
var UserSchema = new Schema({
    // Indicates whether the user is admin.
    isAdmin: {type: Boolean, default: false},
    // Represents the username.
    username: { type: String, required: true, trim: true, index: { unique: true } },
    // Represents the hashed password.
    hashedPassword: { type: String, required: true, trim: false },
    // Represents the client ID.
    clientId: {type: String, required: true, trim: true}
});

UserSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    UserSchema: UserSchema
};
