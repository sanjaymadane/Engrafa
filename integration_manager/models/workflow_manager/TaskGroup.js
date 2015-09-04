/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Represents a Task Group and embedded schemas.
 *
 * @version 1.2
 * @author albertwang, Sky_
 *
 * changes in 1.1:
 * 1. Add new fields to TaskSchema: entryCondition, transformation, input.
 *
 * changes in 1.2:
 * 1. TaskGroupSchema is used as embedded schema.
 */
"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('underscore'),
    WorkUnitProcessingPhase = require("./WorkUnitProcessingPhase");

//Represents a Task.
//embedded
var TaskSchema = new Schema({
    //Represents the CrowdFlower Job ID.
    crowdFlowerJobId: {type: Number, required: true },

    //Represents the CrowdFlower Job IDs of the task's predecessors.
    predecessors: [Number],

    //Represents the entry condition.
    entryCondition: {type: String},

    //Represents the transformation rules, used to transform result from unit task
    //it has format "key_to_transform":{ name: "new_name", value: "new_value" }
    transformation: {type: Schema.Types.Mixed, "default": {}},

    //Represents fields to send to CF Unit
    input: {type: [String], "default": []}
});


//Represents a Task Group.
//embedded
var TaskGroupSchema = new Schema({
    //Represents the processing phase.
    processingPhase: {type: String, required: true, "enum": _.keys(WorkUnitProcessingPhase) },

    //Represents the name of the group.
    name: {type: String},

    //Represents the tasks.
    tasks: {type: [TaskSchema], required: true},

    //Represents the entry condition.
    entryCondition: {type: String}
});

module.exports = {
    TaskGroupSchema: TaskGroupSchema
};