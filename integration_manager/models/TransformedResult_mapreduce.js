/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents output schema from TransformedResult mapreduce operation.
 * This schema must be used only for lookup. Create or update operation should be performed by mapreduce.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
"use strict";

var _ = require('underscore');
var Schema = require('mongoose').Schema;

var fields = {
    clientId: String,
    status: String,
    documentType: String,
    accounts: String,
    state: String,
    jurisdiction: String,
    dueData: Date,
    taxPayerName: String,
    propertyType: String,
    reviewStatus: String,
    assignedStatus: String,
    notes: String,
    documentDate: Date,
    errorMessage: String,
    workUnitStartTime: String
};
var schema = new Schema({value: fields});

schema.options.toJSON = require('./ModelOptions').toJSON;

//user all fields for search text
schema.index({ "$**": "text" }, { name: "TextIndex" });

//index every field for sorting
_.each(fields, function (value, property) {
    var obj = {};
    obj["value." + property] = 1;
    schema.index(obj);
});

module.exports = {
    TransformedResultMapReduceSchema: schema,
    tableName: "transformedresults_mapreduce"
};
