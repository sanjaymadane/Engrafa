/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * Represents a Document Processor.
 *
 * Changes in version 1.1:
 * - Change address to be optional.
 *
 * @version 1.1
 * @author albertwang, arvind81983, duxiaoyang
 */
"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('underscore'),
    DocumentProcessorStatus = require("./DocumentProcessorStatus");

//Represents a Document Processor
var DocumentProcessorSchema =  new Schema({
    //Represents the ID of the AWS EC2 instance.
    ec2InstanceId: {type: String, required: true },

    //Represents the network address (public DNS name).
    address: {type: String, required: false },

    //Represents the last used timestamp (milliseconds since midnight Jan 1, 1970).
    lastUsedTimestamp: {type: Number, required: true },

    //Represents the document processor status.
    status: {type: String, required: true, "enum": _.keys(DocumentProcessorStatus) },

    //Represents the workload of the document processor.
    workload: {type: Number, required: true }
});


module.exports = {
    DocumentProcessorSchema: DocumentProcessorSchema
};
