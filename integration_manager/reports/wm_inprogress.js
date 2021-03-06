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

var reportOutput = "_id,url,processingPhase,isDone,documentType,identifier,startTime,countInProgressCrowdFlowerJobs,inProgressJobs\n";

function setOutput(value) {
    return value;
}

var report = { };

function getDateTime(d) {
    var year    = d.getFullYear();
    var month   = d.getMonth()+1; 
    var day     = d.getDate();
    var hour    = d.getHours();
    var minute  = d.getMinutes();
    var second  = d.getSeconds(); 
    if(month.toString().length == 1) {
        var month = '0'+month;
    }
    if(day.toString().length == 1) {
        var day = '0'+day;
    }   
    if(hour.toString().length == 1) {
        var hour = '0'+hour;
    }
    if(minute.toString().length == 1) {
        var minute = '0'+minute;
    }
    if(second.toString().length == 1) {
        var second = '0'+second;
    }   
    return(year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second);   

}


report.name = 'InProgress_WM_Report';

report.execute = function(outputFileName, callback) {
    var db = require("mongodb").connect('mongodb://localhost:27017/engrafa', function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('workunits').find({isDone:false}).toArray(function(err, workunits) {
            db.close();

            if (err || !workunits) {
                console.log("No workunits");
            } else {
        workunits.forEach(function(workunit) {
            if (workunit.isDone == false) {
                reportOutput = reportOutput + workunit._id + ',';
                reportOutput = reportOutput + '"' + workunit.url + '",';
                reportOutput = reportOutput + '"' + workunit.processingPhase + '",';
                reportOutput = reportOutput + '"' + workunit.isDone + '",';

                var docType = ""
                if (workunit.workflowId == "54aedb94e6c12b1c0e83394c") {docType = "RE Tax Bills"}
                else if (workunit.workflowId == "54aedb94e6c12b1c0e83389e") {docType = "PP Tax Bills"}
                else if (workunit.workflowId == "54aedb94e6c12b1c0e833860") {docType = "Return"}
                else if (workunit.workflowId == "54b2f62f14862b1c157fb013") {docType = "DEV"}

                reportOutput = reportOutput + docType + ',';
                var identifier = "";
                if (workunit.evaluationContext.state) {
                    identifier = identifier + "|" + workunit.evaluationContext.state
                }
                if (workunit.evaluationContext.collectorname) {
                    identifier = identifier + "|" + workunit.evaluationContext.collectorname
                }
                if (workunit.evaluationContext.assessorname) {
                    identifier = identifier + "|" + workunit.evaluationContext.assessorname
                }
                if (identifier.length > 0) {
                    identifier = identifier.substring(1);
                }
            
                reportOutput = reportOutput + identifier + ',';

                var dStart = new Date(workunit.startTime);
                reportOutput = reportOutput + getDateTime(dStart) + ',';
                var countInProgressCrowdFlowerJobs = 0;
                var inProgressCrowdFlowerJobs = "";

                var countInProgressCrowdFlowerJobs = 0;
                var inProgressCrowdFlowerUnits = {};
                for(var inProgressCrowdFlowerUnit in workunit.inProgressCrowdFlowerUnits) {
                    //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                    if (!inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId]) { 
                        inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId] = workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId;
                        inProgressCrowdFlowerJobs = inProgressCrowdFlowerJobs + "|" + workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId 
                        countInProgressCrowdFlowerJobs++;
                    }   
                   //console.log(header);
                }
                //console.log(inProgressCrowdFlowerJobs.length)
                if (inProgressCrowdFlowerJobs.length > 0) {
                    inProgressCrowdFlowerJobs = inProgressCrowdFlowerJobs.substring(1);
                }
                reportOutput = reportOutput + countInProgressCrowdFlowerJobs + "," + inProgressCrowdFlowerJobs + "\n";
                //console.log(reportOutput)
            }
        });

            }

            callback(null, reportOutput);
        });
    });
};

module.exports = report;
