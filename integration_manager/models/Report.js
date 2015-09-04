/*
 * Copyright (C) 2014, 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents a report in the web application.
 *
 * @version 1.0
 * @author sgodwin424
 */

'use strict';

var Schema = require('mongoose').Schema;

var ReportSchema = new Schema({
    fileName: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 25,
        trim: true
    },
    status: {
        type: String,
        enum: [
            'COMPLETED',
            'EXECUTING',
            'FAILED',
            'UNEXECUTED'
        ],
        required: true
    },
    results: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: '',
        maxlength: 140,
        trim: true
    },
    lastExecuted: Date
});

ReportSchema.options.toJSON = require('./ModelOptions').toJSON;

module.exports = {
    ReportSchema: ReportSchema
};
