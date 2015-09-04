/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents integration configuration of a client workflow.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var Schema = require('mongoose').Schema;
var WorkflowMappingRule = require("./WorkflowMappingRule").WorkflowMappingRuleSchema;
var WorkflowTransformationRule = require("./WorkflowTransformationRule").WorkflowTransformationRuleSchema;

// Represents integration configuration of a client workflow.
var WorkflowIntegrationConfigurationSchema = new Schema({
    // Represents the workflow ID.
    workflowId: {type: String, trim: true, required: true},
    // Represents the transformation rules.
    transformationRules: [WorkflowTransformationRule],
    // Represents the mapping rules.
    mappingRules: [WorkflowMappingRule]
});

WorkflowIntegrationConfigurationSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    WorkflowIntegrationConfigurationSchema: WorkflowIntegrationConfigurationSchema
};