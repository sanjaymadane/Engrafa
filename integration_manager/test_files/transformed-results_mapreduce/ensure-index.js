/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Use this script to create indexes for mapreduce table.
 * This script should be run only once and always after `migrate.js`.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var appConfig = require('../../../config');
var mongoose = appConfig.getIntegrationManagerMongoose();
var modelDef = require('../../models/TransformedResult_mapreduce');
var model = mongoose.model('TransformedResultMapReduce', modelDef.TransformedResultMapReduceSchema, modelDef.tableName);


var start = new Date().getTime();
model.ensureIndexes(function (err) {
    if (err) {
        throw err;
    }
    var end = new Date().getTime();
    console.log("total time:", end - start);
    console.log("\nSUCCESS\n");
    process.exit();
});
