/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Insert test data for Document Manager
 *
 * @version 1.0
 * @author arvind81983
 */
"use strict";

var async = require('async');
var config = require('../config');
var mongoose = config.getMongoose();
var ClientFolder = mongoose.model('ClientFolder', require('../models/ClientFolder').ClientFolderSchema);
var Document = mongoose.model('Document', require('../models/Document').DocumentSchema);
var DocumentProcessor = mongoose.model('DocumentProcessor',
    require('../models/DocumentProcessor').DocumentProcessorSchema);

var clientFolders = [
    // Client A - Standard
    {
        "inputFolderId" : 2295708753,
        "outputFolderId" : 2295709089
    }
];

async.waterfall([
    function (cb) {
        ClientFolder.remove(function (err) {
            if (err) {
                throw err;
            }
            cb();
        });
    }, function (cb) {
        DocumentProcessor.remove(function (err) {
            if (err) {
                throw err;
            }
            cb();
        });
    }, function (cb) {
        Document.remove(function (err) {
            if (err) {
                throw err;
            }
            cb();
        });
    }, function (results, cb) {
        async.forEach(clientFolders, function (client, cb) {
            ClientFolder.create(client, function (err, client) {
                if (err) {
                    throw err;
                }
                console.log('Test Data inserted!');
                process.exit(0);
            });
        }, cb);
    }], function (err, obj) {});

