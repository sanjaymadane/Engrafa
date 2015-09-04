'use strict';
var fs = require('fs');
var databaseUrl = "engrafa-test"; // "username:password@example.com/mydb"
var collections = ["workunits"];
var async = require('async');
var db = require("mongojs").connect(databaseUrl, collections);
var header = {};

var reportOutput = "_id,url,processingPhase,isDone,documentType,identifier,startTime,countInProgressCrowdFlowerJobs,inProgressJobs\n";
function setOutput(value) {
    return value;
}

function getDateTime(d) {
    var year    = d.getFullYear();
    var month   = d.getMonth() + 1;
    var day     = d.getDate();
    var hour    = d.getHours();
    var minute  = d.getMinutes();
    var second  = d.getSeconds();
    if (month.toString().length === 1) {
        month = '0' + month;
    }
    if (day.toString().length === 1) {
        day = '0' + day;
    }
    if (hour.toString().length === 1) {
        hour = '0' + hour;
    }
    if (minute.toString().length === 1) {
        minute = '0' + minute;
    }
    if (second.toString().length === 1) {
        second = '0' + second;
    }
    return (year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second);

}

async.waterfall([
    function (cb) {
        db.workunits.find({isDone: false}, function (err, workunits) {
            if (err || !workunits) {
                console.log("No workunits");
            } else {
                //for each document
                cb(false, workunits);
            }
        });
    },
    function (workunits, cb) {

        //build content
        workunits.forEach(function (workunit) {
            if (workunit.isDone === false) {
                reportOutput = reportOutput + workunit._id + ',';
                reportOutput = reportOutput + '"' + workunit.url + '",';
                reportOutput = reportOutput + '"' + workunit.processingPhase + '",';
                reportOutput = reportOutput + '"' + workunit.isDone + '",';

                var docType = "";
                if (workunit.workflowId === "54aedb94e6c12b1c0e83394c") {
                    docType = "RE Tax Bills";
                } else if (workunit.workflowId === "54aedb94e6c12b1c0e83389e") {
                    docType = "PP Tax Bills";
                } else if (workunit.workflowId === "54aedb94e6c12b1c0e833860") {
                    docType = "Return";
                } else if (workunit.workflowId === "54b2f62f14862b1c157fb013") {
                    docType = "DEV";
                }

                reportOutput = reportOutput + docType + ',';
                var identifier = "";
                if (workunit.evaluationContext.state) {
                    identifier = identifier + "|" + workunit.evaluationContext.state;
                }
                if (workunit.evaluationContext.collectorname) {
                    identifier = identifier + "|" + workunit.evaluationContext.collectorname;
                }
                if (workunit.evaluationContext.assessorname) {
                    identifier = identifier + "|" + workunit.evaluationContext.assessorname;
                }
                if (identifier.length > 0) {
                    identifier = identifier.substring(1);
                }

                reportOutput = reportOutput + identifier + ',';

                var dStart = new Date(workunit.startTime);
                reportOutput = reportOutput + getDateTime(dStart) + ',';
                var countInProgressCrowdFlowerJobs = 0;
                var inProgressCrowdFlowerJobs = "";

                var inProgressCrowdFlowerUnits = {}, inProgressCrowdFlowerUnit;
                for (inProgressCrowdFlowerUnit in workunit.inProgressCrowdFlowerUnits) {
                    if (workunit.inProgressCrowdFlowerUnits.hasOwnProperty(inProgressCrowdFlowerUnit)) {
                        //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                        if (!inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId]) {
                            inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId] = workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId;
                            inProgressCrowdFlowerJobs = inProgressCrowdFlowerJobs + "|" + workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId;
                            countInProgressCrowdFlowerJobs++;
                        }
                       //console.log(header);
                    }
                }
                //console.log(inProgressCrowdFlowerJobs.length)
                if (inProgressCrowdFlowerJobs.length > 0) {
                    inProgressCrowdFlowerJobs = inProgressCrowdFlowerJobs.substring(1);
                }
                reportOutput = reportOutput + countInProgressCrowdFlowerJobs + "," + inProgressCrowdFlowerJobs + "\n";
                //console.log(reportOutput)
            }
        });

        var writeReportStream = fs.createWriteStream('inprogress_report.csv');
        writeReportStream.write(reportOutput);

        writeReportStream.on("end", function () {
            writeReportStream.end();
        });
        console.log('done');


    }
]);


