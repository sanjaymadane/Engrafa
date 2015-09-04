/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents the status for checking completed work units..
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;

// Represents the status for checking completed work units..
var WorkUnitCheckingStatusSchema = new Schema({
    // Represents the last checking time.
    lastCheckingTime: {type: Date, required: true}
});

WorkUnitCheckingStatusSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    WorkUnitCheckingStatusSchema: WorkUnitCheckingStatusSchema
};