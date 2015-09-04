/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Represents Document in the system.
 *
 * @version 1.0
 * @author albertwang, Sky_
 */
"use strict";
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

//Represents a Document
var DocumentSchema = new Schema({
    //Represents any data for this document.
    data: {type: Schema.Types.Mixed, "default": {}},

    //Represents flag if document contains data from TAXONOMY phase.
    isReady: {type: Boolean, "default": false},

    //Represents results of all taxonomy tasks.
    taxonomyResults: {type: [Schema.Types.Mixed], "default": []}
});


module.exports = {
    DocumentSchema: DocumentSchema
};
