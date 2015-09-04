/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents transformed result of a work unit.
 *
 * @version 1.1
 * @author albertwang, j3_guile, Sky_
 *
 * changes in 1.1:
 * 1. Add new properties: url, errorMessage.
 */
"use strict";

var Schema = require('mongoose').Schema;
var TransformedResultStatusEnum = require("./TransformedResultStatus");
var TransformedResultReviewStatusEnum = require("./TransformedResultReviewStatus");
var TransformedResultField = require("./TransformedResultField").TransformedResultFieldSchema;

// Represents transformed result of a work unit.
var TransformedResultSchema = new Schema({
    // Represents the client ID.
    clientId: {type: String, required: true},
    // Represents the client name.
    clientName: {type: String, required: true},
    // Represents the work unit ID.
    workUnitId: {type: String, required: true},
    // Represents the workflow ID.
    workflowId: {type: String, required: true},
    // Represents the download URL from BOX.
    url: {type: String, required: true},
    // Represents the fields.
    fields: [TransformedResultField],
    // Represents error message provided by webhook when import failed.
    errorMessage: {type: String, required: false},
    // Represents the status.
    status: {type: String, required: true, "enum": TransformedResultStatusEnum },
    // Represents the review status.
    reviewStatus: {type: String, required: false, "enum": TransformedResultReviewStatusEnum, default: "Not Reviewed" },
    // Represents the review status.
    assignedStatus: {type: String, required: false, default: "Not Assigned" },
    // Represents the notes
    notes: {type: String, required: false},
    // Represents the time when the result was last imported
    lastImportTime: {type: Date, required: false},
    //Represents the start time of the work unit.
    workUnitStartTime: {type: Date},
});

TransformedResultSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    TransformedResultSchema: TransformedResultSchema
};
