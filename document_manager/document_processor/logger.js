/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the winston logger configuration.
 *
 * @version 1.0
 * @author arvind81983
 */
"use strict";

var winston = require('winston');
var winston = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: 'debug' }),
        new (winston.transports.File)({ filename: __dirname + '/cvisionlogs/licUsage.log', level: 'debug' })
    ]
});

module.exports = winston;