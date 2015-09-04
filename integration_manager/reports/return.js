/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
'use strict';

/**
 * Report for return documents.
 *
 * @author sgodwin424
 * @version 1.0
 *
 */

var fs = require('fs');
var returnOutput = "Document ID,Workflow Name,Document Date,Document Name,URL,Status,Review Status,Error Message,Notes,Accounts,State,Assessor Name,Tax Year,Street Address,Return City,Return State,Zip,Return Due Date\n";
function setOutput(value) {
    return value;
}

var report = { };

report.name = 'Return_IM_Report';

report.execute = function(outputFileName, callback) {
    var db = require("mongodb").connect('mongodb://localhost:27017/engrafaim-test', function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('transformedresults').find({}).toArray(function(err, transformedresults) {
            db.close();

            if (err || !transformedresults) {
                console.log("No transformedresults");
            } else {
                transformedresults.forEach( function(transformedresult) {
                    var doc = {};
                    doc.url = transformedresult.url;
                    doc.status = transformedresult.status;
                    doc.reviewStatus = transformedresult.reviewStatus;
                    doc.notes = transformedresult.notes

                    if (transformedresult.errorMessage)
                    {
                        doc.errorMessage = transformedresult.errorMessage;
                    }
                    else
                    {
                        doc.errorMessage = "";
                    }

                        //for each field in the transformaed results
                    for(var field in transformedresult.fields){
                        console.log(transformedresult.fields[field].name)
                        doc[transformedresult.fields[field].name] = transformedresult.fields[field].value;
                    }


                    var docname = doc.DocumentName
                    var docDate = "";
                    docname = docname.split("_")

                    for (var j = 0; j < docname.length; j++) {

                        if (docname[j].substring(0,4) == "2014" || docname[j].substring(0,4) == "2015" || docname[j].substring(0,4) == "2016") {
                            docDate = docname[j-2] + "/" + docname[j-1] + "/" + docname[j].substring(0,4)
                        }
                    }



                if (doc.DocumentType === 'RETURN')
                {
                    returnOutput = returnOutput + '"' + setOutput(doc.DocumentID) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.workflowName) + '",';
                    returnOutput = returnOutput + '"' + setOutput(docDate) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.DocumentName) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.url) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.status) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.reviewStatus) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.errorMessage) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.notes) + '",';
                    returnOutput = returnOutput + '="' + setOutput(doc.accounts) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.State) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.AssessorName) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.TaxYear) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.AddressLine1) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.ReturnCity) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.ReturnState) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.Zip) + '",';
                    returnOutput = returnOutput + '"' + setOutput(doc.ReturnDueDate) + '"\n';
                }
            });
            }

            callback(null, returnOutput);
        });
    });
};

module.exports = report;
