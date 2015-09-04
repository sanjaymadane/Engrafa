/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Use this script to generate mapreduce table from transformed results.
 * This script should be run only once.
 * 
 * Use GUI tools (robomongo) and drop collection `TransformedResult_mapreduce` manually before running this script
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var appConfig = require('../../../config');
var mongoose = appConfig.getIntegrationManagerMongoose();

var TransformedResult = mongoose.model('TransformedResult', require('../../models/TransformedResult').TransformedResultSchema);
var ResultTransformationService = require("../../services/ResultTransformationService");
var tableName = require('../../models/TransformedResult_mapreduce').tableName;

TransformedResult.mapReduce({
    map: ResultTransformationService.mapReduceElement,
    out: { replace: tableName }
}, function (err, model, stats) {
    if (err) {
        throw err;
    }
    console.log(stats);
    console.log("\nSUCCESS\n");
    process.exit();
});