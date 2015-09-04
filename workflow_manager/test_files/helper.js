/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Contains helper method for data generation.
 *
 * @version 1.0
 * @author Sky_
 *
 */
"use strict";


var async = require('async');
var config = require('../../config');
var mongoose = config.getMongoose();
var Client = mongoose.model('Client', require('../models/Client').ClientSchema);
var Document = mongoose.model('Document', require('../models/Document').DocumentSchema);
var WorkUnit = mongoose.model('WorkUnit', require('../models/WorkUnit').WorkUnitSchema);

//exported helper
var helper = {};

/**
 * Clear all collections in database.
 * @param {Function} callback the callback function
 * @throws {Error} if error occurs
 */
helper.clearDatabase = function (callback) {
    async.forEach([Client, Document, WorkUnit], function (model, cb) {
        model.remove({}, cb);
    }, function (err) {
        if (err) {
            throw err;
        }
        callback();
    });
};

/**
 * Clear database, add new clients and exit application.
 * @param {Array} clients the clients to add
 * @throws {Error} if error occurs
 */
helper.insertClients = function (clients) {
    helper.clearDatabase(function () {
        Client.create(clients, function (err) {
            if (err) {
                throw err;
            }
            console.log("ok");
            process.exit(0);
        });
    });
};

module.exports = helper;