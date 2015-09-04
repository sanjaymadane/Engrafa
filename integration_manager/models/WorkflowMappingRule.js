/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Embedded schema that represents a workflow mapping rule.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;

// Embedded schema that represents a a workflow mapping rule.
var WorkflowMappingRuleSchema = new Schema({
    // Represents the field name.
    fieldName: {type: String},
    // Represents the source value.
    value: {type: String},
    // Represents the mapped value.
    mappedValue: {type: String}
});

WorkflowMappingRuleSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    WorkflowMappingRuleSchema: WorkflowMappingRuleSchema
};