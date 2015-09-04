/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the controller that exposes webhook to Integration Manager.
 *
 * @version 1.3
 * @author Sky_, vvvpig
 *
 * changes in 1.1:
 * 1. use SOAP and build xml with "Installments" and "InstallmentDueDates".
 * changes in 1.2:
 * 1. use BOX API to download file.
 *
 * Changes in 1.3:
 * - Updated the configuration file path.
 */
"use strict";
var soap = require('soap');
var fs = require('fs');
var path = require('path');
var winston = require('winston');
var async = require('async');
var _ = require('underscore');
var crypto = require('crypto');
var moment = require('moment');
var request = require('superagent');
var libxml = require('libxmljs');
var config = require('../../config');
var delegates = require('../helpers/DelegateFactory');
var boxService = require("../services/BoxService");
var CONTROLLER = 'WebhookController';
var LogicError = require('../helpers/LogicError');

//Success status from 3rd party client
var OK_STATUS = 1;

//Expected response from 3rd party client
var documentStatusDoc = libxml.parseXmlString(fs.readFileSync(path.join(__dirname, "../xsd/DocumentStatus.xsd"), 'utf8'));

/**
 * Send data to /resultImportStatuses
 * @param {Object} data the data to send
 * @param {Function} callback the callback function
 */
function sendData(data, callback) {
    winston.info("Sending to /resultImportStatuses %j", data, {});
    request.post(config.API_SERVER_URL + "/resultImportStatuses")
        .send(data)
        .auth(config.CLIENT_ID, config.AUTHENTICATION_KEY)
        .end(function (err, response) {
            if (err) {
                return callback(err);
            }
            if (!response.ok) {
                return callback(new Error("Cannot post resultImportStatuses, status = " + response.status));
            }
            callback();
        });
}

/**
 * Hook for ready_for_import items.
 *
 * @param {Object} req the expressJS request object
 * @param {Function} next the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) output - the committed output by this method
 */
function importResult(req, next) {
    var signature = req.get('X-Engrafa-Signature');
    if (!signature) {
        return next(new Error("Signature required"));
    }
    // check if signature is valid
    var expectedSignature = crypto.createHmac('SHA256', config.AUTHENTICATION_KEY)
        .update(JSON.stringify(req.body))
        .digest('base64');
    if (signature !== expectedSignature) {
        return next(new Error("Invalid signature"));
    }
    var transformedResult;
    async.waterfall([
        // get result details from API
        function (cb) {
            request.get(config.API_SERVER_URL + "/results")
                .query({
                    workUnitId: req.body.workUnitId,
                    workflowId: req.body.workflowId
                })
                .auth(config.CLIENT_ID, config.AUTHENTICATION_KEY)
                .end(function (err, response) {
                    if (err) {
                        return cb(err);
                    }
                    if (!response.ok) {
                        return cb(new Error("Cannot get the result, status = " + response.status));
                    }
                    if (response.body.length !== 1) {
                        return cb(new Error("Results returned  " + response.body.length  + " elements"));
                    }
                    cb(null, response.body[0]);
                });

        }, function (result, cb) {
            transformedResult = result;
            //download file from box
            boxService.downloadFile(transformedResult.workUnitId, cb);
            /*
            request.get(transformedResult.url).buffer(true).end(function (err, response) {
                if (err) {
                    return cb(err);
                }
                if (!response.ok) {
                    return cb(new Error("Cannot download the file, status = " + response.status));
                }
                cb(null, new Buffer(response.text, 'binary').toString('base64'));
            });
            */
        }, function (base64File, cb) {
            //add this to debug base64 encoded pdf file
            //winston.debug(new Buffer(base64File, 'base64').toString());
            //change all fields to lowercase
            var name2Field = {};
            _.each(transformedResult.fields, function (f) {
                if (f.name) {
                    name2Field[f.name] = f;
                    f.name = String(f.name).toLowerCase();
                }
            });

            //get value from field
            var getValue = function (prop) {
                //fix issue with same lower case lower case for taxyear and TaxYear by searching same case first.
                if (name2Field[prop] && name2Field[prop].value !== "null") {
                    return name2Field[prop].value;
                }
                var field = _.findWhere(transformedResult.fields, {name: prop.toLowerCase()});
                if (field && field.value !== "null") {
                    return field.value;
                }
                return null;
            };

            //convert date string into YYYY-MM-DD format
            var convertDate = function (value) {
                var tempDate = new Date(value);
                var year, month, day;

                year = String(tempDate.getFullYear());

                month = String(tempDate.getMonth() + 1);
                if (month.length === 1) {
                    month = "0" + month;
                }
                day = String(tempDate.getDate());
                if (day.length === 1) {
                    day = "0" + day;
                }
                var newDate = year + "-" + month + "-" + day;
                return newDate;
            };

            //add node to xml
            var addEle = function (node, prop) {
                var value = getValue(prop);
                if (value) {
                    node.node(prop, value);
                }
            };

            var node, i, j, accountsNode, accounts,
                splitChar = "|";

            //convert json result to XML
            var doc = new libxml.Document();
            var root = doc.node('Document');

            // create <Information> node
            var informationNode = root.node('Information');
            var informationProperties = ["DocumentID", "WorkflowName", "DocumentType", "DocumentName"];
            _.each(informationProperties, function (prop) {
                addEle(informationNode, prop);
            });
            informationNode.node("DocumentFile", base64File);

            // create <Content> node
            var contentNode = root.node('Content');
            var newaccount, hasAccounts;

            //AND ADD ESCALATION JOB FOR DEV
            if (getValue("DocumentType") === "TAXBILL") {
                // create <TaxBillContent> node
                var taxBillNode = contentNode.node('TaxBillContent');

                // create <Accounts> node
                accountsNode = taxBillNode.node("Accounts");
                accounts = getValue("accounts");
                if (accounts) {
                    accounts = accounts.split(splitChar);
                } else {
                    //accounts = [];
                    return cb(new LogicError("Accounts Missing"));
                }

                hasAccounts = false;
                if (accounts.length > 0) {
                    for (i = 0; i < accounts.length; i++) {

                        newaccount = "";
                        for (j = 0; j < accounts[i].length; j++) {
                            if (accounts[i][j].match(/[0-9a-z]/i)) {
                                newaccount = newaccount + accounts[i][j];
                            }

                        }
                        accounts[i] = newaccount;

                        //remove leading zeroes
                        while (accounts[i][0] === '0' || accounts[i][0] === '.' || accounts[i][0] === '-') {
                            accounts[i] = accounts[i].substring(1);
                        }

                        if (accounts[i] !== "") {
                            hasAccounts = true;
                            node = accountsNode.node("Account");
                            node.node("AccountNumber", accounts[i]);
                        }

                    }
                }
                if (!hasAccounts) {
                    return cb(new LogicError("Accounts Missing"));
                }

                // Additional TaxBillContent elements
                var taxbillProperties = ["State", "CollectorName", "PropertyType"];
                _.each(taxbillProperties, function (prop) {
                    addEle(taxBillNode, prop);
                });

                //tax year
                if (getValue("TaxYear")) {
                    if (getValue("TaxYear").indexOf('-') > 0) {
                        return cb(new LogicError("Tax Year Top Coder Issue, Resubmit"));
                    }

                    taxBillNode.node("TaxYear", getValue("TaxYear"));
                } else {
                    return cb(new LogicError("Tax Year Missing"));
                }

                // create <PaymentAddress> node
                var paymentAddressNode = taxBillNode.node("PaymentAddress");
                var paymentAddressProperties = ["Name", "Title", "AddressLine2", "AddressLine1", "PaymentCity", "PaymentState", "Zip"];
                if (!getValue("PaymentCity") || !getValue("PaymentState") || !getValue("Zip")) {
                    return cb(new LogicError("Address Component Missing"));
                }
                _.each(paymentAddressProperties, function (prop) {
                    var value;
                    if (prop === "PaymentCity") {
                        value = getValue(prop);
                        if (value) {
                            paymentAddressNode.node("City", value);
                        }
                    } else if (prop === "PaymentState") {
                        value = getValue(prop);
                        if (value) {
                            paymentAddressNode.node("State", value);
                        }
                    } else if (prop === "AddressLine2") {
                        value = getValue(prop);
                        if (value) {
                            paymentAddressNode.node("AddressLine1", value);
                        }
                    } else if (prop === "AddressLine1") {
                        value = getValue(prop);
                        if (value) {
                            paymentAddressNode.node("AddressLine2", value);
                        }
                    } else {
                        addEle(paymentAddressNode, prop);
                    }
                });

                if (getValue("GrossAmountDue")) {
                    taxBillNode.node("GrossamountDue", getValue("GrossAmountDue"));
                } else {
                    return cb(new LogicError("Gross Amount Due Missing"));
                }
                if (getValue("GrossAmountDueDate")) {
                    taxBillNode.node("GrossamountDueDate", convertDate(getValue("GrossAmountDueDate")));
                } else {
                    return cb(new LogicError("Gross Amount Due Date Missing"));
                }

                var installmentsNode = taxBillNode.node("Installments");

                var installments = getValue("Installments");
                var installmentDueDates = getValue("InstallmentDueDates");


                if (installments) {
                    installments = installments.split(splitChar);
                } else {
                    //installments = [];
                    return cb(new LogicError("Installments Missing"));
                }
                if (installmentDueDates) {
                    installmentDueDates = installmentDueDates.split(splitChar);
                } else {
                    //installmentDueDates = [];
                    return cb(new LogicError("Installment Due Dates Missing"));
                }

                if (installments.length !== installmentDueDates.length) {
                    return cb(new LogicError("Installment and Installment Due Dates Mismatch"));
                }

                for (i = 0; i < installments.length; i++) {
                    node = installmentsNode.node("Installment");
                    node.node("InstallmentAmountDue", Number(installments[i]).toFixed(2));
                    node.node("InstallmentDueDate", convertDate(installmentDueDates[i]));
                }

            } else if (getValue("DocumentType") === "RETURN") {
                // create <ReturnContent> node
                var returnNode = contentNode.node('ReturnContent');

                // create <Accounts> node
                accountsNode = returnNode.node("Accounts");
                accounts = getValue("accounts");
                if (accounts) {
                    accounts = accounts.split(splitChar);
                } else {
                    //accounts = [];
                    return cb(new LogicError("Accounts Missing"));
                }

                hasAccounts = false;
                if (accounts.length > 0) {
                    for (i = 0; i < accounts.length; i++) {

                        newaccount = "";
                        for (j = 0; j < accounts[i].length; j++) {
                            if (accounts[i][j].match(/[0-9a-z]/i)) {
                                newaccount = newaccount + accounts[i][j];
                            }

                        }
                        accounts[i] = newaccount;

                        //remove leading zeroes
                        while (accounts[i][0] === '0' || accounts[i][0] === '.' || accounts[i][0] === '-') {
                            accounts[i] = accounts[i].substring(1);
                        }
                        if (accounts[i] !== "") {
                            hasAccounts = true;
                            node = accountsNode.node("Account");
                            node.node("AccountNumber", accounts[i]);
                        }
                    }
                }
                if (!hasAccounts) {
                    return cb(new LogicError("Accounts Missing"));
                }


                if (!getValue("TaxYear")) {
                    return cb(new LogicError("Tax Year Missing"));
                }


                // Additional ReturnContent elements
                var returnProperties = ["State", "AssessorName", "TaxYear"];
                _.each(returnProperties, function (prop) {
                    addEle(returnNode, prop);
                });

                // create <ReturnAddress> node
                var returnAddressProperties = ["AddressLine1", "ReturnCity", "ReturnState", "Zip"];
                if (getValue("AddressLine1") && getValue("ReturnCity") && getValue("ReturnState") && getValue("Zip")) {
                    var returnAddressNode = returnNode.node("ReturnAddress");
                    _.each(returnAddressProperties, function (prop) {
                        var value;
                        if (prop === "ReturnCity") {
                            value = getValue(prop);
                            if (value) {
                                returnAddressNode.node("City", value);
                            }
                        } else if (prop === "ReturnState") {
                            value = getValue(prop);
                            if (value) {
                                returnAddressNode.node("State", value);
                            }
                        } else {
                            addEle(returnAddressNode, prop);
                        }
                    });
                }

                // create <ReturnDueDate> node
                var returnDueDate = getValue("ReturnDueDate");
                if (returnDueDate) {
                    if (convertDate(returnDueDate).indexOf('2001') > -1) {
                        return cb(new LogicError("Return Due Date Top Coder Issue, Resubmit"));
                    }
                    returnNode.node("ReturnDueDate", convertDate(returnDueDate));
                } else {
                    return cb(new LogicError("Return Due Date Missing"));
                }


            } else if (getValue("DocumentType") === "ASSESSMENT") {
                // create <AssessmentContent> node
                var assessmentNode = contentNode.node('AssessmentContent');

                // create <Accounts> node
                accountsNode = assessmentNode.node("Accounts");
                accounts = getValue("accounts");
                if (accounts) {
                    accounts = accounts.split(splitChar);
                } else {
                    //accounts = [];
                    return cb(new LogicError("Accounts Missing"));
                }

                hasAccounts = false;
                if (accounts.length > 0) {
                    for (i = 0; i < accounts.length; i++) {

                        newaccount = "";
                        for (j = 0; j < accounts[i].length; j++) {
                            if (accounts[i][j].match(/[0-9a-z]/i)) {
                                newaccount = newaccount + accounts[i][j];
                            }

                        }
                        accounts[i] = newaccount;

                        //remove leading zeroes
                        while (accounts[i][0] === '0' || accounts[i][0] === '.' || accounts[i][0] === '-') {
                            accounts[i] = accounts[i].substring(1);
                        }
                        if (accounts[i] !== "") {
                            hasAccounts = true;
                            node = accountsNode.node("Account");
                            node.node("AccountNumber", accounts[i]);
                        }
                    }
                }
                if (!hasAccounts) {
                    return cb(new LogicError("Accounts Missing"));
                }

                if (!getValue("TaxYear")) {
                    return cb(new LogicError("Tax Year Missing"));
                }

                // Additional AssessmentContent elements
                var assessmentProperties = ["State", "AssessorName", "TaxYear", "PropertyType"];
                _.each(assessmentProperties, function (prop) {
                    addEle(assessmentNode, prop);
                });

                // create <AppealAddress> node
                var appealAddressProperties = ["AddressLine1", "AppealCity", "AppealState", "Zip"];
                //if (!getValue("AddressLine1") || !getValue("AppealCity") || !getValue("AppealState") || !getValue("Zip"))
                //{
                //    return cb(new LogicError("Address Component Missing"));
                //}
                if (getValue("AddressLine1") && getValue("AppealCity") && getValue("AppealState") && getValue("Zip")) {
                    var appealAddressNode = assessmentNode.node("AppealAddress");
                    _.each(appealAddressProperties, function (prop) {
                        var value;
                        if (prop === "AppealCity") {
                            value = getValue(prop);
                            if (value) {
                                appealAddressNode.node("City", value);
                            }
                        } else if (prop === "AppealState") {
                            value = getValue(prop);
                            if (value) {
                                appealAddressNode.node("State", value);
                            }
                        } else {
                            addEle(appealAddressNode, prop);
                        }
                    });
                }

                // create <AppealDueDate> node
                var appealDueDate = getValue("AppealDueDate");
                if (appealDueDate) {
                    assessmentNode.node("AppealDueDate", convertDate(appealDueDate));
                } else {
                    return cb(new LogicError("Appeal Due Date Missing"));
                }

                // create <NoticeValues> node
                var noticeValuesNode = assessmentNode.node("NoticeValues");
                var marketValue;
                var assessedValue;
                var taxableValue;
                //if property type PP
                if (getValue("PropertyType") === "PP") {
                    node = noticeValuesNode.node("PPNoticeValues");

                    marketValue = getValue("MarketValue");
                    assessedValue = getValue("AssessedValue");
                    taxableValue = getValue("TaxableValue");
                    if (!marketValue && !assessedValue && !taxableValue) {
                        return cb(new LogicError("Values Missing"));
                    }


                    if (marketValue) {
                        node.node("MarketValue", marketValue);
                    }
                    if (assessedValue) {
                        node.node("AssessedValue", assessedValue);
                    }
                    if (taxableValue) {
                        node.node("TaxableValue", taxableValue);
                    }
                } else {
                    node = noticeValuesNode.node("RENoticeValues");
                    marketValue = getValue("MarketValue");
                    assessedValue = getValue("AssessedValue");
                    taxableValue = getValue("TaxableValue");
                    var marketValueLand =  getValue("MarketValueLand");
                    var marketValueBuilding = getValue("MarketValueBuilding");
                    var marketValueMisc = getValue("MarketValueMisc");
                    var assessedValueLand =  getValue("AssessedValueLand");
                    var assessedValueBuilding = getValue("AssessedValueBuilding");
                    var assessedValueMisc = getValue("AssessedValueMisc");


                    if (!marketValue && !assessedValue && !taxableValue && !marketValueLand && !marketValueBuilding && !marketValueMisc && !assessedValueLand && !assessedValueBuilding && !assessedValueMisc) {
                        return cb(new LogicError("Values Missing"));
                    }

                    if (marketValueLand) {
                        if (marketValueLand) {
                            node.node("MarketValueLand", marketValueLand);
                        }
                        if (marketValueBuilding) {
                            node.node("MarketValueBuilding", marketValueBuilding);
                        }
                        if (marketValueMisc) {
                            node.node("MarketValueMisc", marketValueMisc);
                        }
                    } else if (marketValue) {
                        node.node("MarketValueMisc", marketValue);
                    }
                    if (assessedValueLand) {
                        if (assessedValueLand) {
                            node.node("AssessedValueLand", assessedValueLand);
                        }
                        if (assessedValueBuilding) {
                            node.node("AssessedValueBuilding", assessedValueBuilding);
                        }
                        if (assessedValueMisc) {
                            node.node("AssessedValueMisc", assessedValueMisc);
                        }
                    } else if (assessedValue) {
                        node.node("AssessedValueMisc", assessedValue);
                    }
                    if (taxableValue) {
                        node.node("TaxableValue", taxableValue);
                    }


                }

            }


            // send xml to client
            soap.createClient(config.SOAP_WSDL_URL, function (err, client) {
                if (err) {
                    return cb(err);
                }
                if (!client[config.SOAP_METHOD_NAME]) {
                    return cb(new Error("Can not find method " + config.SOAP_METHOD_NAME + " in soap server " + config.SOAP_WSDL_URL));
                }

                // add custom soap headers
                client.addSoapHeader(config.SOAP_HEADERS);

                // add authentication
                client.setSecurity(new soap.WSSecurity(config.SOAP_SECURITY_USER, config.SOAP_SECURITY_PASSWORD));

                // build request body
                var body = {};

                // remove xml header to avoid issue with real soap server.
                body[config.SOAP_REQUEST_NAME] = doc.toString().replace('<?xml version="1.0" encoding="UTF-8"?>', "");

                winston.info("xml %s", body[config.SOAP_REQUEST_NAME]);

                client[config.SOAP_METHOD_NAME](body, function (err, response) {
                    if (err) {
                        return cb(err);
                    }

                    // Use client.lastRequestHeaders/client.lastRequest/client.lastMessage to debug
                   // winston.info("Submit Document Headers %j", client.lastRequestHeaders, {});
                    // winston.info("Submit Document request %s", client.lastRequest);
                   // winston.info("Submit Document response %j", response, {});
                    var result = response[config.SOAP_RESPONSE_NAME];
                    var xmlDoc;
                    try {
                        xmlDoc = libxml.parseXmlString(result);
                    } catch (e) {
                        return cb(new Error("Invalid XML from client"));
                    }
                    if (!xmlDoc.validate(documentStatusDoc)) {
                        return cb(new Error("XML doesn't match DocumentStatus.xsd"));
                    }
                    var status = Number(xmlDoc.get("//Status").text());
                    var data = {
                        id: req.body.id,
                        message: xmlDoc.get("//StatusMessage").text()
                    };
                    if (status === OK_STATUS) {
                        data.succeeded = true;
                    } else {
                        data.succeeded = false;
                        data.failedFields = [];
                    }
                    sendData([data], cb);
                });
            });
        }
    ], function (err) {
        if (err) {
            var data = {
                id: req.body.id,
                message: err.message,
                succeeded: false
            };
            sendData([data], function (err2) {
                //If the err occured is LogicError and not error during resultImportStatuses
                //of the data then callback with ok:true
                if (err instanceof LogicError && !err2) {
                    next(null, {ok: true});
                } else {
                    next(err2 || err);
                }
            });
            return;
        }
        next(null, {ok: true});
    });
}


module.exports = {
    importResult: delegates.controller(CONTROLLER, importResult)
};