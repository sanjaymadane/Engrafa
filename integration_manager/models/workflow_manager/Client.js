/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Represents a Client and embedded schemas.
 *
 * @version 1.0
 * @author Sky_
 */
"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    TaskGroupSchema = require("./TaskGroup").TaskGroupSchema;


//Represents a Workflow.
//embedded
var WorkflowSchema = new Schema({
    //Represents the name of the workflow.
    name: {type: String, required: true},

    //Represents ID of the Box folder for input files.
    input: {type: Number, required: true},

    //Represents ID of the Box folder for output files.
    output: {type: Number, required: true},

    //Represents the tasks groups.
    taskGroups: {type: [TaskGroupSchema], required: true}
});


//Represents a Client
var ClientSchema = new Schema({
    //Represents the name of the client.
    name: {type: String, required: true},

    //Represents the workflows.
    workflows: {type: [WorkflowSchema], required: true}
});


module.exports = {
    ClientSchema: ClientSchema,
    WorkflowSchema: WorkflowSchema
};