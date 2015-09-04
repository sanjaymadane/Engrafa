/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Contains validation functions
 *
 * @version 1.2
 * @author Sky_
 * changes in 1.1:
 * 1. Remove prefix in validate method if input object is invalid.
 * 2. Add validation rule for workflow.
 *
 * changes in 1.2:
 * 1. Change validation for workflow to match new schema.
 */
"use strict";


var validator = require('rox').validator;


/**
 * Define a global function used for validation.
 * @param {Object} input the object to validate
 * @param {Object} definition the definition object. Refer to rox module for more details.
 * @param {String} [prefix] the prefix for error message.
 * @returns {Error} error if validation failed or null if validation passed.
 */
function validate(input, definition, prefix) {
    var error = validator.validate(prefix || "prefix-to-remove", input, definition);
    if (!error) {
        return null;
    }
    //remove prefix in error message
    error.message = error.message.replace("prefix-to-remove.", "");
    //if input is invalid then change the name to input
    error.message = error.message.replace("prefix-to-remove", "input");
    return error;
}

//the list of TaskGroup
validator.registerAlias("workflow", {
    name: {type: String},
    input: {type: "Integer", min: 1},
    output: {type: "Integer", min: 1},
    taskGroups: [
        {
            processingPhase: {"enum": ["CLASSIFICATION", "TAXONOMY", "EXTRACTION", "REVIEW", "ESCALATION"]},
            name: {type: String, required: false},
            entryCondition: {type: String, required: false},
            tasks: [
                {
                    entryCondition: {type: String, required: false},
                    crowdFlowerJobId: {type: "Integer", min: 1},
                    predecessors: {
                        type: [
                            {type: "Integer", min: 1}
                        ],
                        empty: true
                    },
                    input: {
                        type: ["String"],
                        empty: true
                    },
                    transformation: {type: "anyObject", required: false}
                }
            ]
        }
    ]
});

//WorkUnit database model
validator.registerType({
    name: "WorkUnit",
    validate: function (name, value, params, validator) {
        var notObject = validator.validate(name, value, "object");
        if (notObject && value.constructor.modelName !== "WorkUnit") {
            return new Error(name + " should be WorkUnit type");
        }
        return null;
    }
});

//object with any properties
validator.registerType({
    name: "anyObject",
    validate: function (name, value, params, validator) {
        return validator.validate(name, value, {__strict: false});
    }
});

//MongoDB id
validator.registerType({
    name: "objectId",
    validate: function (name, value, params, validator) {
        var notString = validator.validate(name, value, "string");
        if (notString || !/^[a-zA-Z0-9]{24}$/.test(value)) {
            return new Error(name + " should be a valid ObjectId (24 hex characters)");
        }
        return null;
    }
});

module.exports = {
    validate: validate
};