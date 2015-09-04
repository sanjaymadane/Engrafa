/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the controller that exposes web service for processing a PDF document.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

var documentProcessor = require('../services/DocumentProcessor');
var fs = require('fs');
var config = require('../config');
var uuid = require('uuid');
var helper = require('../helper');

/**
 * This controller method handles request to process a PDF document.
 * @param req the request
 * @param res the response
 * @param callback the callback function
 * @return None
 */
exports.processDocument = function (req, res) {
    helper.Log("processDocument called");
    if (!(req.files && req.files.inputFile && req.files.inputFile.path)) {
        helper.Log("error reading the file");
        res.status(500).send('Input in wrong format');
    }
    var path = require('path');
    var ext = path.extname(req.files.inputFile.path);
    // Copy input file to processing directory
    var inputFile = config.DOCUMENT_PROCESSING_DIRECTORY + "/" + uuid.v4() + ext;
    var outputFile = config.DOCUMENT_PROCESSING_DIRECTORY + "/" + uuid.v4() + ext;

    fs.readFile(req.files.inputFile.path, function (err, data) {
        fs.writeFile(inputFile, data, function (err) {
            if (err) {
                helper.Log("error writing the file");
                res.status(500).send('Failed to process PDF document');
            } else {
                helper.Log("input file copied, processing document...");
                // process document
                documentProcessor.processDocument(inputFile, outputFile, function (err) {
                    if (err) {
                        helper.Log("error processing document");
                        helper.Log(err);
                        res.status(500).send('Failed to process PDF document');
                    } else {
                        // send back processed document

                        // If the trapeze license has expired, no outputFile
                        // outputFile = inputFile;

                        res.download(outputFile, req.files.inputFile.name, function (err) {
                            helper.Log("file downloaded, removing temp files i:" + inputFile + " o:" + outputFile);
                            // remove files
                            fs.unlink(inputFile);
                            fs.unlink(outputFile);
                            res.end();
                        });
                    }
                });
            }
        });
    });
};


/**
 * This controller method handles request to get Trapeze license usage log.
 * @param req the request
 * @param res the response
 * @param callback the callback function
 * @return None
 */
exports.getTrapezeLicenseUsageLog = function (req, res) {
    helper.Log("getTrapezeLicenseUsageLog called");
    res.download(config.CVISION_TRAPEZE_LICENSE_USAGE_LOG, 'licUsage.log', function (err) {
        helper.Log("usage log file downloaded");
        helper.Log(err);
        res.end();
    });
};
