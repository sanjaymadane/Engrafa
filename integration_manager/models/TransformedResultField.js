/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Embedded schema that represents a field of transformed result.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;

// Embedded schema that represents a field of transformed result.
var TransformedResultFieldSchema = new Schema({
    // Represents the field name.
    name: {type: String, required: true},
    // Represents the field value.
    value: {type: String},
    // Represents the confidence.
    confidence: {type: Number},
    // Represents the job name.
    jobName: {type: String},
    // Indicates whether the field failed import.
    importFailed: {type: Boolean},
    // Represents the error message.
    errorMessage: {type: String}
});

TransformedResultFieldSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    TransformedResultFieldSchema: TransformedResultFieldSchema
};