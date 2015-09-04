/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents a webhook.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;
var WebhookTypeEnum = require("./WebhookType");

// Embedded schema that represents a webhook.
var WebhookSchema = new Schema({
    type: {type: String, required: true, "enum": WebhookTypeEnum},
    url: {type: String, required: true}
});

WebhookSchema.options.toJSON = require('./ModelOptions').toJSON;


module.exports = {
    WebhookSchema: WebhookSchema
};