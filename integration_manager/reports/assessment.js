/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
'use strict';

/**
 * Report for other (not TAXBILL or RETURN) documents.
 *
 * @author sgodwin424
 * @version 1.0
 *
 */

var fs = require('fs');
var assessmentOutput = "Document ID,Workflow Name,Document Date,Document Name,URL,Status,Review Status,Error Message,Notes,Accounts,State,Assessor Name,Tax Year,Property Type,Street Address,City,State,Zip,Appeal Date,Market Value,Assessed Value,Taxable Value,Market Value Land, Market Value Building, Market Value Misc,Assessed Value Land, Assessed Value Building,Assessed Value Misc,Taxable Value\n";
function setOutput(value) {
    return value;
}

var report = { };

report.name = 'Assessment_IM_Report';

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


                if (doc.DocumentType !== 'RETURN' && doc.DocumentType !== 'TAXBILL') {
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.DocumentID) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.workflowName) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(docDate) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.DocumentName) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.url) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.status) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.reviewStatus) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.errorMessage) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.notes) + '",';
                    assessmentOutput = assessmentOutput + '="' + setOutput(doc.accounts) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.State) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AssessorName) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.TaxYear) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.PropertyType) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AddressLine1) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AppealCity) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AppealState) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.Zip) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AppealDueDate) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.MarketValue) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AssessedValue) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.TaxableValue) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.MarketValueLand) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.MarketValueBuilding) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.MarketValueMisc) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AssessedValueLand) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AssessedValueBuilding) + '",';
                    assessmentOutput = assessmentOutput + '"' + setOutput(doc.AssessorValueMisc) + '"\n';
                }
            });
            }

            callback(null, assessmentOutput);
        });
    });
};

module.exports = report;
