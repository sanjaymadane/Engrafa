"use strict";
var fs = require('fs');
var databaseUrl = "engrafaim-test"; // "username:password@example.com/mydb"
var collections = ["transformedresults"];
var db = require("mongojs").connect(databaseUrl, collections);
var returnOutput = "Document ID,Workflow Name,Document Name,URL,Status,Error Message,Accounts,State,Assessor Name,Tax Year,Street Address,Return City,Return State,Zip,Return Due Date\n";
var taxbillOutput = "Document ID,Workflow Name,Document Name,URL,Status,Error Message,Accounts,Installments,Installment Due Dates,State,Collector Name,Tax Year,Property Type,Addressee 1,Addressee 2,Street Address 1,Street Address 2,Payment City,Payment State,Zip,Gross Amount Due,Gross Amount Due Date\n";
var assessmentOutput = "Document ID,Workflow Name,Document Name,URL,Status,Error Message,Accounts,State,Assessor Name,Tax Year,Property Type,Street Address,City,State,Zip,Appeal Date,Market Value,Assessed Value,Taxable Value,Market Value Land, Market Value Building, Market Value Misc,Assessed Value Land, Assessed Value Building,Assessed Value Misc,Taxable Value\n";
function setOutput(value) {
    return value;
}

db.transformedresults.find({}, function (err, transformedresults) {
    console.log(transformedresults.length);
    if (err || !transformedresults) {
        console.log("No transformedresults");
    }
    //for each document 
    else {
        transformedresults.forEach(function (transformedresult) {
            var doc = {};
            doc.url = transformedresult.url;
            doc.status = transformedresult.status;
            if (transformedresult.errorMessage) {
                doc.errorMessage = transformedresult.errorMessage;
            }
            else {
                doc.errorMessage = "";
            }

            //for each field in the transformaed results
            for (var field in transformedresult.fields) {
                if (transformedresult.fields.hasOwnProperty(field)) {
                    console.log(transformedresult.fields[field].name);
                    doc[transformedresult.fields[field].name] = transformedresult.fields[field].value;
                }
            }
            console.log(doc.DocumentType + transformedresult._id);
            if (doc.DocumentType === 'RETURN') {
                returnOutput = returnOutput + '"' + setOutput(doc.DocumentID) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.workflowName) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.DocumentName) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.url) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.status) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.errorMessage) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.accounts) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.State) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.AssessorName) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.TaxYear) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.AddressLine1) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.ReturnCity) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.ReturnState) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.Zip) + '",';
                returnOutput = returnOutput + '"' + setOutput(doc.ReturnDueDate) + '"\n';
            }
            else if (doc.DocumentType === 'TAXBILL') {
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.DocumentID) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.workflowName) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.DocumentName) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.url) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.status) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.errorMessage) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.accounts) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.Installments) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.InstallmentDueDates) + '",';
                //taxbillOutput = taxbillOutput + '"' + setOutput(doc.discountDueDates) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.State) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.CollectorName) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.TaxYear) + '",';
                taxbillOutput = taxbillOutput + '"' + setOutput(doc.PropertyType) + '",';
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
            else {
                assessmentOutput = assessmentOutput + '"' + setOutput(doc.DocumentID) + '",';
                assessmentOutput = assessmentOutput + '"' + setOutput(doc.workflowName) + '",';
                assessmentOutput = assessmentOutput + '"' + setOutput(doc.DocumentName) + '",';
                assessmentOutput = assessmentOutput + '"' + setOutput(doc.url) + '",';
                assessmentOutput = assessmentOutput + '"' + setOutput(doc.status) + '",';
                assessmentOutput = assessmentOutput + '"' + setOutput(doc.errorMessage) + '",';
                assessmentOutput = assessmentOutput + '"' + setOutput(doc.accounts) + '",';
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


            //process.exit(0);    
        });
    }


    console.log('out');
    var writeReturnStream = fs.createWriteStream('return_report.csv');
    writeReturnStream.write(returnOutput);

    writeReturnStream.on("end", function () {
        writeReturnStream.end();
    });

    var writeTaxBillStream = fs.createWriteStream('taxbill_report.csv');
    writeTaxBillStream.write(taxbillOutput);

    writeTaxBillStream.on("end", function () {
        writeTaxBillStream.end();
    });

    var writeAssessmentStream = fs.createWriteStream('assessment_report.csv');
    writeAssessmentStream.write(assessmentOutput);

    writeAssessmentStream.on("end", function () {
        writeAssessmentStream.end();
    });


});

