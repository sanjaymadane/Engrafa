/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents REST API configuration of a client.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;
var Webhook = require("./Webhook").WebhookSchema;

// Represents REST API configuration of a client.
var ClientAPIConfigurationSchema = new Schema({
    // Represents the client ID.
    clientId: {type: String, required: true, trim: true},
    // Represents the authentication key.
    authenticationKey: {type: String, required: true, trim:true},
    // Represents the webhooks.
    webhooks: [Webhook]
});


ClientAPIConfigurationSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    ClientAPIConfigurationSchema: ClientAPIConfigurationSchema
};