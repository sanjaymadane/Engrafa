/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Embedded schema that represents a workflow transformation rule.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;

// Embedded schema that represents a a workflow transformation rule.
var WorkflowTransformationRuleSchema = new Schema({
    // Represents the rule expression.
    rule: {type: String, required: true, trim: true}
});

WorkflowTransformationRuleSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    WorkflowTransformationRuleSchema: WorkflowTransformationRuleSchema
};