/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Represents a Work Unit and embedded schemas.
 *
 * @version 1.3
 * @author albertwang, Sky_, mln
 *
 * changes in 1.1:
 * 1. Add transformations to CrowdFlowerUnitSchema.
 * 2. Add taskGroups to WorkUnitSchema.
 * 3. Add crowdFlowerJobName to CrowdFlowerUnitResultSchema.
 *
 * changes in 1.2:
 * 1. Add resultXMLFileId to WorkUnitSchema.
 *
 * changes in 1.3:
 * 1. Add client, workflowId, statistics to WorkUnitSchema.
 * 2. Add virtual property workflow to WorkUnitSchema.
 *
 * changes in 1.4:
 * 1. add startTime, endTime, cost to CrowdFlowerUnitSchema.
 * 2. add startTime, endTime, cost, fileName to WorkUnitSchema.
 */
"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('underscore'),
    WorkUnitProcessingPhase = require("./WorkUnitProcessingPhase"),
    TaskGroupSchema = require("./TaskGroup").TaskGroupSchema;


//Represents a CrowdFlower Unit.
//embedded
var CrowdFlowerUnitSchema = new Schema({
    //Represents the CrowdFlower Job ID.
    crowdFlowerJobId: {type: Number, required: true},

    //Represents the CrowdFlower Unit ID.
    crowdFlowerUnitId: {type: Number, required: true},

    //Indicates whether the CrowdFlower Unit is finalized.
    isDone: {type: Boolean, required: true},

    //Represents the transformation rules, used to transform result from unit task
    //it has format "key_to_transform":{ name: "new_name", value: "new_value" }
    transformation: {type: Schema.Types.Mixed, "default": {}},

    //Represents the start time of the work unit.
    startTime: {type: Date},

    //Represents the end time of the work unit.
    endTime: {type: Date}
});

//Represents a CrowdFlower Unit Result Field.
//embedded
var CrowdFlowerUnitResultFieldSchema = new Schema({
    //Represents the field name.
    name: {type: String, required: true},

    //Represents the field value.
    // 8/11/14 JF - Updated to false to allow for null values
    value: {type: String, required: false},

    //Represents the field confidence.
    // 8/11/14 JF - Updated to false to allow for null values
    confidence: {type: Number, required: false}
});


//Represents a CrowdFlower Unit Result.
//embedded
var CrowdFlowerUnitResultSchema = new Schema({
    //Represents the CrowdFlower Job ID.
    crowdFlowerJobId: {type: Number, required: true},

    //Represents the CrowdFlower Job Name.
    crowdFlowerJobName: {type: String, required: true},

    //Represents the CrowdFlower Unit ID.
    crowdFlowerUnitId: {type: Number, required: true},

    //Represents the judgment count.
    judgmentCount: {type: Number, required: true},

    //Represents the cost of the current task.
    cost: {type: Number},

    //Represents the fields.
    fields: {type: [CrowdFlowerUnitResultFieldSchema], required: false}// cant set empty array without this
});


//Represents a Work Unit
var WorkUnitSchema =  new Schema({
    //Represents the ID, the Box file ID will be used.
    _id: {type: Number, required: true, index: true, unique: true},

    //Represents the URL of the PDF file.
    url: {type: String, required: true},

    //Represents the randomized file name of the uploaded file.
    fileName: {type: String, required: true},

    //Indicates whether all tasks are done for the work unit.
    isDone: {type: Boolean, required: true},

    //Represents all in-progress CrowdFlower units that are being worked on by CrowdFlower contributors.
    inProgressCrowdFlowerUnits: {type: [CrowdFlowerUnitSchema], "default": []},

    //Represents all finished (aka "finalized") CrowdFlower units.
    finishedCrowdFlowerUnits: {type: [CrowdFlowerUnitSchema], "default": []},

    //Represents results of all classification tasks.
    classificationResults: {type: [CrowdFlowerUnitResultSchema], "default": []},

    //Represents results of all taxonomy tasks.
    taxonomyResults: {type: [CrowdFlowerUnitResultSchema], "default": []},

    //Represents results of all extraction tasks.
    extractionResults: {type: [CrowdFlowerUnitResultSchema], "default": []},

    //Represents current processing phase.
    processingPhase: {type: String, "enum": _.keys(WorkUnitProcessingPhase), required: true},

    //Represents aggregated results of all finished tasks so far,
    //as well as the total judgment count of each finished task (with property key "J<jobId>_judgment_count")
    //and confidence level of each aggregated field result (with property key "<field_name>_confidence").
    //It is used for entry-condition evaluation.
    evaluationContext: {type: Schema.Types.Mixed, "default": {}},

    //Represents the result XML for a finished work unit.
    resultXML: {type: String},

    //Represents task groups used by this work unit.
    taskGroups: [TaskGroupSchema],

    //Represents the box file id for uploaded XML file.
    resultXMLFileId: {type: Number},

    //Represents the owner client of this work unit.
    client : {type: Schema.Types.ObjectId, ref: 'Client', required: true},

    //Represents the workflow id of the client used by this work unit.
    workflowId : {type: Schema.Types.ObjectId, required: true},

    //Represents work unit statistics
    statistics: {type: Schema.Types.Mixed, "default": {}},

    //Represents the start time of the work unit.
    startTime: {type: Date},

    //Represents the end time of the work unit.
    endTime: {type: Date},

    //Represents the cost of all underlying task.
    cost: {type: Number}
});


//Get workflow object from client using stored workflowId.
WorkUnitSchema.virtual("workflow").get(function () {
    var self = this;
    if (!self.client) {
        return null;
    }
    return _.find(self.client.workflows, function (item) {
        return String(item.id) === String(self.workflowId);
    });
});

module.exports = {
    WorkUnitSchema: WorkUnitSchema
};
