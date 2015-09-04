/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Represents a Client folder.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

//Represents a Client Folder
var ClientFolderSchema =  new Schema({
    //Represents the Box input folder ID to hold original PDF files.
    inputFolderId: {type: String, required: true },

    //Represents the Box output folder ID to hold processed PDF files.
    outputFolderId: {type: String, required: true }
});


module.exports = {
    ClientFolderSchema: ClientFolderSchema
};
