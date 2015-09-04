/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Use this file to update resultXMLFileId in done work units.
 *
 * This is HACK file. Use it if you don't want to complete standard workflow with crowdflower.
 *
 * @version 1.0
 * @author Sky_
 */
"use strict";

//set target file id from box.com
//this file must exist in your account and should have .xml extension
var TARGET_FILE_ID = 20479691863;

var config = require('../../config');
var mongoose = config.getMongoose();
var WorkUnit = mongoose.model('WorkUnit', require('../models/WorkUnit').WorkUnitSchema);

WorkUnit.update({ isDone: true },
    { resultXMLFileId: TARGET_FILE_ID },
    { multi: true}, function (err, affected) {
        if (err) {
            throw err;
        }
        console.log('The number of updated documents was %d', affected);
        process.exit(0);
    });