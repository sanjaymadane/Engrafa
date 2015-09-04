/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
'use strict';

/**
 * Report for taxbill documents.
 *
 * @author sgodwin424
 * @version 1.0
 *
 */

var fs = require('fs');
var mongodb = require('mongodb');
var path = require('path');

var taxbillOutput = "Document ID,Workflow Name,Document Date,Document Name,URL,Status,Review Status,Error Message,Notes,Accounts,State,Collector Name,Tax Year,Property Type,Installments,Installment Due Dates,Addressee 1,Addressee 2,Street Address 1,Street Address 2,Payment City,Payment State,Zip,Gross Amount Due,Gross Amount Due Date\n";

var report = {
    name: 'Tax_Bill_IM_Report'
};

var filename = report.name + '.csv';
var filePath = path.join(__dirname, 'execution_results', filename);

function setOutput(value) {
    return value;
}

report.execute = function(outputFileName, callback) {
    var wstream;

    if (outputFileName) {
        filePath = path.join(__dirname, 'execution_results', outputFileName + '.csv');
    }

    //Remove any old instances of the report execution
    try {
        fs.unlinkSync(filePath);
    } catch (e) {
        //Error number 34 indicates that the file does not exist - in which case we can ignore
        //the error
        if (e.errno !== 34) {
            console.log(e);
            console.log('ERROR: Could not delete the old instances of the report execution');
            return callback(e);
        }
    }

    //Create a new instance of the report execution results
    wstream = fs.createWriteStream(filePath);
    //Write the CSV headers
    wstream.write(taxbillOutput);

    mongodb.connect('mongodb://localhost:27017/engrafaim-test', function(err, db) {
        if (err) {
            wstream.end();
            return callback(err);
        }

        db.collection('transformedresults').find({}).toArray(function(err, transformedresults) {
            db.close();

            if (err || !transformedresults) {
                console.log("No transformedresults");
            } else {
                transformedresults.forEach(function(transformedresult) {
                    var doc = {};
                    var field;

                    doc.url = transformedresult.url;
                    doc.status = transformedresult.status;
                    doc.reviewStatus = transformedresult.reviewStatus;
                    doc.notes = transformedresult.notes;

                    if (transformedresult.errorMessage) {
                        doc.errorMessage = transformedresult.errorMessage;
                    } else {
                        doc.errorMessage = "";
                    }

                    //for each field in the transformed results
                    for(field in transformedresult.fields) {
                        if (transformedresult.fields.hasOwnProperty(field)) {
                            console.log(transformedresult.fields[field].name);
                            doc[transformedresult.fields[field].name] = transformedresult.fields[field].value;
                        }
                    }

                    var docname = doc.DocumentName;
                    var docDate = "";
                    docname = docname.split("_");

                    for (var j = 0; j < docname.length; j++) {

                        if (docname[j].substring(0,4) === "2014" || docname[j].substring(0,4) === "2015" || docname[j].substring(0,4) === "2016") {
                            docDate = docname[j-2] + "/" + docname[j-1] + "/" + docname[j].substring(0,4);
                        }
                    }

                    for (field in transformedresult.fields) {
                        if (transformedresult.fields.hasOwnProperty(field)) {
                            doc[transformedresult.fields[field].name] = transformedresult.fields[field].value;
                        }
                    }

                    //Reset the contents of the existing row
                    taxbillOutput = '';

                    if (doc.DocumentType === 'TAXBILL') {
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.DocumentID) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.workflowName) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(docDate) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.DocumentName) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.url) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.status) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.reviewStatus) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.errorMessage) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.notes) + '",';
                        taxbillOutput = taxbillOutput + '="' + setOutput(doc.accounts) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.State) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.CollectorName) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.TaxYear) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.PropertyType) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.Installments) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.InstallmentDueDates) + '",';
                        //taxbillOutput = taxbillOutput + '"' + setOutput(doc.discountDueDates) + '",';
                        //taxbillOutput = taxbillOutput + '"' + setOutput(doc.payto) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.name) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.title) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.AddressLine1) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.AddressLine2) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.PaymentCity) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.PaymentState) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.Zip) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.GrossAmountDue) + '",';
                        taxbillOutput = taxbillOutput + '"' + setOutput(doc.GrossAmountDueDate) + '"\n';
                        //taxbillOutput = taxbillOutput + '"' + setOutput(doc.numPayments) + '"\n';
                    }

                    //Save the row contents
                    if (taxbillOutput.length > 0) {
                        wstream.write(taxbillOutput);
                    }
                });
            }

            wstream.end();
            callback(null, '');
        });
    });
};

module.exports = report;
