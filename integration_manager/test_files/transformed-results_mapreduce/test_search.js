/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Use this script to test performance of indexes.
 * If you don't run `ensure-index.js` query will execute in ~400ms (NOTE: $text query will throw error if there is no index for it)
 * Indexes version will execute in ~20ms
 *
 * Multiple column sorting is not indexed, because it's not possible to create indexes for all columns combination (2^13)
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


model.find({'value.status': 'import_failed'}).sort({'value.status': 1}).skip(1).limit(1).exec(function (err, result) {
    if (err) {
        throw err;
    }
    var end = new Date().getTime();
    console.log(result);
    console.log("TEST#1 TOTAL TIME:", end - start);
});


//Comment this query if indexes are not created
model.find({'$text' : {$search: 'TX'}}).sort({'value.state': 1}).skip(1).limit(1).exec(function (err, result) {
    if (err) {
        throw err;
    }
    var end = new Date().getTime();
    console.log(result);
    console.log("TEST#2 TOTAL TIME:", end - start);
});