/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This service provides a method to process input PDF document using CVISION Trapeze.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

var config = require('../config');
var async = require('async');
var shell = require('shelljs');
var helper = require('../helper');

/**
 * Process input PDF file using CVISION Trapeze.
 * @param inputFile the input file
 * @param outputFile the output file
 * @param callback the callback function
 * @return None
 */
exports.processDocument = function (inputFile, outputFile, callback) {
    helper.Log("processDocument called " + inputFile + " " + outputFile);
    async.waterfall([

        // If the trapeze license has expired, comment out and do nothing

        function (cb) {
            // Execute CVISION Trapeze to process input PDF
            var command = config.CVISION_TRAPEZE_COMMAND + " -in \"" + inputFile + "\" -out \"" + outputFile + "\"";
            helper.Log("cmd: " + command);

            shell.exec(command,
                function (code) {
                    if (code !== 0) {
                        helper.Log("process document returned error" + code);
                        cb(new Error("Failed to process file"));
                    } else {
                        helper.Log('Sucessfully processed file:' + inputFile + ' and ' +
                            'output is available at: ' + outputFile);
                        cb();
                    }
                });
        }], callback);
};
