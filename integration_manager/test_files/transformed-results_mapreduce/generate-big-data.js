/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Use this script to generate big set of data for TransformedResults.
 * Existing data won't be removed. Drop collection manually (use GUI tool robomongo).
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

//configure number of items to add
//must be multiple of PAGE_SIZE
var COUNT = 50000;

//items will be created in batch insert
//this is size of single batch
var PACK_SIZE = 100;

var chance = require("chance")();
var Moniker = require("moniker");
var verb = Moniker.generator([Moniker.verb], {glue: " "});
var noun = Moniker.generator([Moniker.noun], {glue: " "});
var adjective = Moniker.generator([Moniker.noun], {glue: " "});
var async = require('async');
var _ = require('underscore');
var appConfig = require('../../../config');
var mongoose = appConfig.getIntegrationManagerMongoose();
var TransformedResult = mongoose.model('TransformedResult', require('../../models/TransformedResult').TransformedResultSchema);
var TransformedResultReviewStatus = require("../../models/TransformedResultReviewStatus");
var TransformedResultAssignedStatus = require("../../models/TransformedResultAssignedStatus");
var created = 0;

var started = new Date().getTime();

//it takes some time to generate data
//output current status every 5s
setInterval(function () {
    console.log("created", created, "(time " + (new Date().getTime() - started) + "ms)");
}, 5000);


var packs = COUNT / PACK_SIZE;

var workUnitId = 1;

async.forEachSeries(_.range(1, packs), function (nr, cb) {
    var left = PACK_SIZE;
    var items = [], status, error, documentDate;
    while (left--) {
        status = _.sample(["import_failed", "import_succeeded", "rejected"]);
        error = "";
        if (status !== "import_succeeded") {
            error = chance.sentence({words: 5});
        }
        documentDate = chance.date({year: _.sample([2016, 2015, 2014]), string: true})
            .replace(/\//g, "_"); //replace / to _

        items.push({
            "clientId": "5433b9d504ab3d832ebf9c0d",
            "clientName": "ClientA",
            "workUnitId": String(workUnitId++),
            "workflowId": "5433b9d504ab3d832ebf9c1a",
            "url": "https://app.box.com/s/azfanekc4epfufsauv1q",
            "status": status,
            "notes": chance.sentence({words: 5}),
            "workUnitStartTime": "2014-10-07T10:20:06.119Z",
            "errorMessage": error,
            "lastImportTime": "2015-06-25T18:55:30.887Z",
            "assignedStatus": _.sample(TransformedResultAssignedStatus),
            "reviewStatus": _.sample(TransformedResultReviewStatus),
            "fields": [

                {
                    "name": "DocumentName",
                    "value": "go-webapps_" + documentDate + ".pdf"
                },
                {
                    "name": "DocumentType",
                    "value": _.sample(["TAXBILL", "RETURN", "ASSESSMENT"])
                },
                {
                    "name": "State",
                    "value": chance.state()
                },
                {
                    "name": "PropertyType",
                    "value": verb.choose()
                },
                {
                    "name": "AssessorName",
                    "value": chance.first()
                },
                {
                    "name": "TaxPayerName",
                    "value": chance.last()
                },
                {
                    "name": "GrossAmountDueDate",
                    "value": chance.date({year: "2016", string: true})
                },
                {
                    "name": "accounts",
                    "value": adjective.choose()
                },
                {
                    "name": "accounts",
                    "value": noun.choose()
                }
            ]
        });
    }
    TransformedResult.collection.insert(items, function (err) {
        created += PACK_SIZE;
        cb(err);
    });
}, function (err) {
    if (err) {
        throw err;
    }
    console.log("\nSUCCESS\n");
    process.exit();
});
