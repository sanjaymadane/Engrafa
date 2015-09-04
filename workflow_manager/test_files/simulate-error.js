/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * The sample script that throws the 'VersionError: No matching document found' error.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
"use strict";
var config = require('../../config');
var async = require('async');
var mongoose = config.getMongoose();
var WorkUnit = mongoose.model('WorkUnit', require('../models/WorkUnit').WorkUnitSchema);

async.waterfall([
    function (cb) {
        WorkUnit.remove({}, cb);
    }, function (count, result, cb) {
        WorkUnit.create({
            _id: 12,
            url: "1234",
            fileName: "asd",
            isDone: false,
            processingPhase: "TAXONOMY",
            client: "123456789012345678901234",
            workflowId: "123456789012345678901234"
        }, cb);
    },
    //step 1
    function (workUnitA, cb) {
        setInterval(function () {
            workUnitA.finishedCrowdFlowerUnits.push({
                crowdFlowerJobId: 1,
                crowdFlowerUnitId: 1234,
                isDone: true
            });
            //after each call of `save` the __v is increased, because we change the subarray 
            workUnitA.save(function (err) {
                if (err) {
                    console.log("step1 error");
                    throw err;
                }
                console.log("step1 version after save", workUnitA.__v);
            });
        }, 1000);
        WorkUnit.findById(workUnitA.id, cb);
    },
    //step 2
    function (workUnitB) {
        //here we have a new instance of workunit, `workUnitA.save` from previous step won't affect this work unit
        setInterval(function () {
            //we replace the subarray
            workUnitB.finishedCrowdFlowerUnits = [];
            workUnitB.markModified("finishedCrowdFlowerUnits");
            console.log("step2 version before save", workUnitB.__v);
            workUnitB.save(function (err) {
                //error is returned, because latest version is `2`, but version of workUnitB is `0`
                if (err) {
                    console.log("step2 error");
                    throw err;
                }
                console.log("step2 no error");
            });
        }, 2300);
    }
]);
