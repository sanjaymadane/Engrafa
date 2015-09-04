/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Represents Document in the system.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('underscore'),
    ObjectId = Schema.ObjectId,
    DocumentStatus = require("./DocumentStatus");

//Represents a Document
var DocumentSchema =  new Schema({
    //Represents the original Box file ID.
    originalFileId: {type: String, required: true },

    //Represents the processed Box file ID.
    processedFileId: {type: String},

    //Represents the converted Box document ID.
    convertedDocumentId: {type: String},

    //Represents the document status.
    status: {type: String, required: true, "enum": _.keys(DocumentStatus) },

    //Represents the ID of corresponding ClientFolder.
    clientFolderId: {type: ObjectId, required: true, ref: "ClientFolder" },

    //Represents the file name.
    fileName: {type: String, required: true },

    //Represents the created timestamp (milliseconds since midnight Jan 1, 1970).
    created: {type: Number, required: true },
});


module.exports = {
    DocumentSchema: DocumentSchema
};
