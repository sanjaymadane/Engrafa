/*
 * Copyright (C) 2014, 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Script to populate database.
 *
 * @version 1.3
 * @author j3_guile, Sky_, vvpig
 *
 * changes in 1.1:
 * 1. Add Webhook for clientA (webhook to middleware_service).
 * 2. Add more rules for clientA (add default properties to pass validation of Document.xsd).
 *
 * changes in 1.2:
 * 1 Update rule for Accounts list to concatenate using "|"
 * 2 add rule "Installments" and "InstallmentDueDates". These will be "|" separated lists.
 *
 * Changes in 1.3:
 * - Updated the configuration file path.
 */
'use strict';

var async = require('async');
var appConfig = require('../../config');
var helper = require('../test_files/helper');
var mongoose = appConfig.getIntegrationManagerMongoose();
var apacheMd5 = require('apache-md5');

var User = mongoose.model('User', require('../models/User').UserSchema);
var WIC = mongoose.model('WorkflowIntegrationConfiguration', require('../models/WorkflowIntegrationConfiguration').WorkflowIntegrationConfigurationSchema);
var CAC = mongoose.model('ClientAPIConfiguration', require('../models/ClientAPIConfiguration').ClientAPIConfigurationSchema);

//URL for webhook for client A
var CLIENT_A_HOOK = "http://localhost:4240/import";

async.waterfall([
    // purge the integration manager database
    function (cb) {
        helper.purge(mongoose)(cb);
    },

    // populate the integration manager database
    // Assumes Workflow Manager data already exists
    function (cb) {
        async.parallel([

            // Create users for each Workflow Manager Client + admin
            function (cb) {
                // Client A user
                User.create({
                    isAdmin: false,
                    username: 'user1',
                    hashedPassword: apacheMd5('user1'),
                    clientId: '5433b9d504ab3d832ebf9c0d'
                }, cb);
            }, function (cb) {
                // Client A admin
                User.create({
                    isAdmin: true,
                    username: 'admin1',
                    hashedPassword: apacheMd5('admin1'),
                    clientId: '5433b9d504ab3d832ebf9c0d'
                }, cb);
            }, function (cb) {
                User.create({
                    isAdmin: true,
                    username: 'admin',
                    hashedPassword: apacheMd5('admin'),
                    clientId: 'admin'
                }, cb);
            },

            // Create Client API Configurations per client
            function (cb) {
                // Client A
                CAC.create({
                    clientId: '5433b9d504ab3d832ebf9c0d',
                    authenticationKey: 'clientKey',
                    webhooks: [{
                        type: "result_ready_for_import",
                        url: CLIENT_A_HOOK
                    }]
                }, cb);
            },

            // Create Workflow Integration Configurations per workflow per client
            function (cb) {
                // clientA-standard
                WIC.create({
                    workflowId: '5433b9d504ab3d832ebf9c1a',
                    transformationRules: [
                        {rule: '$add.DocumentID = workUnitId'},
                        {rule: '$add.DocumentType = workflowName'},
                        {rule: 'if (workflowName.match(/(tax).*(bill)/i)) $set.DocumentType = "TAXBILL"'},
                        {rule: '$add.DocumentName = fileName'},
                        {rule: '$add.Accounts = ""'},
                        {rule: 'if (typeof accountnumber !== "undefined") $set.Accounts = Accounts + accountnumber + "|"'},
                        {rule: 'if (typeof parcelnumber !== "undefined") $set.Accounts = Accounts + parcelnumber + "|"'},
                        {rule: 'if (typeof propertynumber !== "undefined") $set.Accounts = Accounts + propertynumber + "|" '},
                        {rule: '$set.Accounts = Accounts.replace(/\\|\\s*$/, "")'},
                        {rule: 'if (typeof state !== "undefined") $add.State = state'},
                        {rule: 'if (typeof collectorname !== "undefined") $add.CollectorName = collectorname'},
                        {rule: 'if (typeof propertytype !== "undefined" && propertytype != "unknown") $add.PropertyType = propertytype'},
                        {rule: 'if (typeof taxyear !== "undefined") $add.TaxYear = taxyear'},
                        {rule: 'if (typeof addressaddressee1 !== "undefined") $add.AddressLine1 = addressaddressee1'},
                        {rule: 'if (typeof streetaddress !== "undefined") $add.AddressLine2 = streetaddress'},
                        {rule: 'if (typeof paymentcity !== "undefined") $add.City = paymentcity'},
                        // TODO: Payment state is different than tax bill state
                        //{rule: 'if (typeof paymentstate !== "undefined") $add.State = paymentstate'},
                        {rule: 'if (typeof zip !== "undefined") $add.Zip = zip'},
                        {rule: 'if (typeof grossamountdue !== "undefined") $add.GrossamountDue = grossamountdue'},
                        {rule: 'if (typeof grossamountdueduedate !== "undefined") $add.GrossamountDueDate = grossamountdueduedate'},

                        //add properties if missing to match the required Document.xsd
                        {rule: 'if (typeof PropertyType === "undefined") $add.PropertyType = "PP"'},
                        {rule: 'if (typeof TaxYear === "undefined") $add.TaxYear = "2000"'},
                        {rule: 'if (typeof PayTo === "undefined") $add.PayTo = "user1"'},
                        {rule: 'if (typeof AddressLine1 === "undefined") $add.AddressLine1 = "address1"'},
                        {rule: 'if (typeof AddressLine2 === "undefined") $add.AddressLine2 = "address2"'},
                        {rule: 'if (typeof City === "undefined") $add.City = "New York"'},
                        {rule: 'if (typeof PaymentCity === "undefined") $add.PaymentCity = "Seattle"'},
                        {rule: 'if (typeof State === "undefined") $add.State = "NY"'},
                        {rule: 'if (typeof PaymentState === "undefined") $add.PaymentState = "WA"'},
                        {rule: 'if (typeof Zip === "undefined") $add.Zip = "90210"'},
                        {rule: 'if (typeof GrossamountDue === "undefined") $add.GrossamountDue = "1000"'},
                        {rule: 'if (typeof GrossamountDueDate === "undefined") $add.GrossamountDueDate = "2012-12-13"'},
                        {rule: 'if (typeof TaxableValue === "undefined") $add.TaxableValue = "123"'},
                        {rule: 'if (typeof TaxPayerName === "undefined") $add.TaxPayerName = "user2"'},
                        {rule: 'if (typeof IncludesPenalty === "undefined") $add.IncludesPenalty = "true"'},
                        {rule: 'if (typeof PenaltyValueAmount === "undefined") $add.PenaltyValueAmount = "12345"'},
                        {rule: 'if (typeof PenaltyInterestAmount === "undefined") $add.PenaltyInterestAmount = "12"'},
                        {rule: 'if (typeof Installments === "undefined") $add.Installments = "100|200"'},
                        {rule: 'if (typeof InstallmentDueDates === "undefined") $add.InstallmentDueDates = "2015-01-01|2015-02-01"'},

                        // Override properties specific to client endpoint
                        {rule: '$set.DocumentType = "TAXBILL"'},
                        {rule: '$set.workflowName = "COMCAST"'},
                    ],
                    mappingRules: [
                        {
                            fieldName: 'state2',
                            value: 'NE edited',
                            mappedValue: 'NE (edited by state2)'
                        },
                        {
                            fieldName: 'collectorname',
                            value: 'TERRENCE GAFFY',
                            mappedValue: 'TGaffy'
                        },
                        {
                            fieldName: 'state',
                            value: 'AL edited',
                            mappedValue: 'AL'
                        }
                    ]
                }, cb);
            }
        ], cb);
    }
], function () {
    console.log('Test data has been reset for "%s"', mongoose.name);
    process.exit(0);
});
