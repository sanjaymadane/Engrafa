/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Simulate totalTime in statistic in all not done work units.
 *
 * @version 1.0
 * @author Sky_
 */
"use strict";


var config = require('../../config');
var mongoose = config.getMongoose();
var WorkUnit = mongoose.model('WorkUnit', require('../models/WorkUnit').WorkUnitSchema);

WorkUnit.update({ isDone: false },
    { statistics: {totalTime: 10000} },
    { multi: true}, function (err, affected) {
        if (err) {
            throw err;
        }
        console.log('The number of updated documents was %d', affected);
        process.exit(0);
    });