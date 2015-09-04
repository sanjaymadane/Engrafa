"use strict";

var fs = require('fs');
var databaseUrl = "engrafa-test"; // "username:password@example.com/mydb"
var collections = ["workunits"];
var async = require('async');
var db = require("mongojs").connect(databaseUrl, collections);
var header = {};

var reportOutput = "_id,url,fileName,processingPhase,isDone,docType,state,assessor-collector,startTime,endTime,totalTime,averageJobTime,minJobTime,maxJobTime,cost,countFinishedCrowdFlowerJobs,averageJobCost,minJobCost,maxJobCost,classificationCost,taxonomyCost,extractionCost,countInProgressCrowdFlowerJobs,isTaxonomy,countClassificationCrowdFlowerJobs,countTaxonomyCrowdFlowerJobs,countExtractionCrowdFlowerJobs,countMasterJobs,countExpertJobs,";
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
        db.workunits.find({}, function (err, workunits) {
            if (err || !workunits) {
                console.log("No workunits");
            } else {
                //for each document
                cb(false, workunits);
            }
        });
    },
    function (workunits, cb) {
        //build header
        workunits.forEach(function (workunit) {
            var finishedCrowdFlowerUnit;
           // console.log(workunit)
            for (finishedCrowdFlowerUnit in workunit.finishedCrowdFlowerUnits) {
                if (workunit.finishedCrowdFlowerUnits.hasOwnProperty(finishedCrowdFlowerUnit)) {
                    //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                    header[workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId] = workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId;
                   //console.log(header);
                }
            }

        });
        /*for (var job in header) {
            //console.log(job)
            reportOutput = reportOutput + job + "_jobName," + job + "_unitId," + job + "_judgmentCount," + job + "_cost," + job + "_startTime," + job + "_endTime," + job + "_totalTime," + job + "_phase,";

        }*/
        reportOutput = reportOutput + "\n";

        //build content
        workunits.forEach(function (workunit) {
            //if (workunit.isDone == true) {
//            if (true) {
            var averageTotalTime = 0;
            var averageTotalCost = 0;
            var minJobCost = 0;
            var maxJobCost = 0;
            var minJobTime = 0;
            var maxJobTime = 0;
            var countMasterJobs = 0;
            var countExpertJobs = 0;
            var isTaxonomy = false;
            var state = "";
            var assessorCollector = "";


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
            if (workunit.evaluationContext.state) {
                state = workunit.evaluationContext.state;
            }
            if (workunit.evaluationContext.collectorname) {
                assessorCollector = workunit.evaluationContext.collectorname;
            }
            if (workunit.evaluationContext.assessorname) {
                assessorCollector = workunit.evaluationContext.assessorname;
            }

           // console.log(workunit)
            reportOutput = reportOutput + workunit._id + ',';
            reportOutput = reportOutput + '"' + workunit.url + '",';
            reportOutput = reportOutput + '"' + workunit.fileName + '",';
            reportOutput = reportOutput + '"' + workunit.processingPhase + '",';
            reportOutput = reportOutput + '"' + workunit.isDone + '",';
            reportOutput = reportOutput + docType + ',';
            reportOutput = reportOutput + state + ',';
            reportOutput = reportOutput + assessorCollector + ',';
            var dStart = new Date(workunit.startTime);
            reportOutput = reportOutput + getDateTime(dStart) + ',';
            var dEnd = new Date(workunit.endTime);
            reportOutput = reportOutput + getDateTime(dEnd) + ',';
            var totalTime = Math.floor((dEnd - dStart) / 60000);
//            var overallCost = workunit.cost;


            var countFinishedCrowdFlowerJobs = 0;
            var finishedCrowdFlowerUnits = {}, finishedCrowdFlowerUnit;
            for (finishedCrowdFlowerUnit in workunit.finishedCrowdFlowerUnits) {
                if (workunit.finishedCrowdFlowerUnits.hasOwnProperty(finishedCrowdFlowerUnit)) {
                    //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                    if (!finishedCrowdFlowerUnits[workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId]) {
                        finishedCrowdFlowerUnits[workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId] = workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId;
                        countFinishedCrowdFlowerJobs++;
                    }
                   //console.log(header);
                }
            }

            var countInProgressCrowdFlowerJobs = 0;
            var inProgressCrowdFlowerUnits = {}, inProgressCrowdFlowerUnit;
            for (inProgressCrowdFlowerUnit in workunit.inProgressCrowdFlowerUnits) {
                if (workunit.inProgressCrowdFlowerUnits.hasOwnProperty(inProgressCrowdFlowerUnit)) {
                    //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                    if (!inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId]) {
                        inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId] = workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId;
                        countInProgressCrowdFlowerJobs++;
                    }
                   //console.log(header);
                }
            }

            var countClassificationJobs = 0;
            var classificationJobs = {};
            var countTaxonomyJobs = 0;
            var taxonomyJobs = {};
            var countExtractionJobs = 0;
            var extractionJobs = {};
            var countJobsForCalcs = 0;
            var classificationCost = 0;
            var taxonomyCost = 0;
            var extractionCost = 0;

            var jobResults = {}, classificationResult, jobCost, dDiff;
            //classification results
            for (classificationResult in workunit.classificationResults) {
                if (workunit.classificationResults.hasOwnProperty(classificationResult)) {
                    if (header[workunit.classificationResults[classificationResult].crowdFlowerJobId]) {
                        if (!classificationJobs[workunit.classificationResults[classificationResult].crowdFlowerJobId]) {
                            classificationJobs[workunit.classificationResults[classificationResult].crowdFlowerJobId] = workunit.classificationResults[classificationResult].crowdFlowerJobId;
                            countClassificationJobs++;

                            //come back and fix costs for master jobs...

                            dStart = new Date(workunit.evaluationContext["J" + workunit.classificationResults[classificationResult].crowdFlowerJobId + "_startTime"]);
                            dEnd = new Date(workunit.evaluationContext["J" + workunit.classificationResults[classificationResult].crowdFlowerJobId + "_endTime"]);
                            dDiff = Math.floor((dEnd - dStart) / 60000);

                            if (workunit.classificationResults[classificationResult].crowdFlowerJobName.indexOf('Master') > -1) {
                                countMasterJobs++;
                                //jobCost = 0;
                                //overallCost = overallCost - workunit.classificationResults[classificationResult].cost;
                            } else {
                                if (workunit.classificationResults[classificationResult].crowdFlowerJobName.indexOf('Validate') > -1) {
                                    countExpertJobs++;
                                }
                                countJobsForCalcs++;
                                jobCost = workunit.classificationResults[classificationResult].cost;
                                classificationCost = classificationCost + jobCost;
                                if (dDiff) {
                                    averageTotalTime = averageTotalTime + dDiff;
                                }
                                averageTotalCost = averageTotalCost + jobCost;
                                if (minJobTime === 0 || dDiff < minJobTime) {
                                    minJobTime = dDiff;
                                }
                                if (maxJobTime === 0 || dDiff > maxJobTime) {
                                    maxJobTime = dDiff;
                                }
                                if (minJobCost === 0 || jobCost < minJobCost) {
                                    minJobCost = jobCost;
                                }
                                if (maxJobCost === 0 || jobCost > maxJobCost) {
                                    maxJobCost = jobCost;
                                }

                            }
                            jobResults[workunit.classificationResults[classificationResult].crowdFlowerJobId] = '"' + workunit.classificationResults[classificationResult].crowdFlowerJobName + '",' + workunit.classificationResults[classificationResult].crowdFlowerUnitId + ',' + workunit.classificationResults[classificationResult].judgmentCount + ',' + jobCost + ',' + getDateTime(dStart) + ',' + getDateTime(dEnd) + ',' + dDiff + ',CLASSIFICATION,';

                        }
                    }
                }
            }
            //extraction results
            var extractionResult;
            for (extractionResult in workunit.extractionResults) {
                if (workunit.extractionResults.hasOwnProperty(extractionResult)) {
                    if (header[workunit.extractionResults[extractionResult].crowdFlowerJobId]) {
                        if (!extractionJobs[workunit.extractionResults[extractionResult].crowdFlowerJobId]) {
                            extractionJobs[workunit.extractionResults[extractionResult].crowdFlowerJobId] = workunit.extractionResults[extractionResult].crowdFlowerJobId;
                            countExtractionJobs++;
                            //come back and fix costs for master jobs....
                            dStart = new Date(workunit.evaluationContext["J" + workunit.extractionResults[extractionResult].crowdFlowerJobId + "_startTime"]);
                            dEnd = new Date(workunit.evaluationContext["J" + workunit.extractionResults[extractionResult].crowdFlowerJobId + "_endTime"]);
                            dDiff = Math.floor((dEnd - dStart) / 60000);

                            if (workunit.extractionResults[extractionResult].crowdFlowerJobName.indexOf('Master') > -1) {
                                countMasterJobs++;
                                //jobCost = 0;
                                //overallCost = overallCost - workunit.extractionResults[extractionResult].cost;
                            } else {
                                if (workunit.classificationResults[classificationResult].crowdFlowerJobName.indexOf('Validate') > -1) {
                                    countExpertJobs++;
                                }
                                countJobsForCalcs++;
                                jobCost = workunit.extractionResults[extractionResult].cost;
                                extractionCost = extractionCost + jobCost;
                                if (dDiff) {
                                    averageTotalTime = averageTotalTime + dDiff;
                                }
                                averageTotalCost = averageTotalCost + jobCost;
                                if (minJobTime === 0 || dDiff < minJobTime) {
                                    minJobTime = dDiff;
                                }
                                if (maxJobTime === 0 || dDiff > maxJobTime) {
                                    maxJobTime = dDiff;
                                }
                                if (minJobCost === 0 || jobCost < minJobCost) {
                                    minJobCost = jobCost;
                                }
                                if (maxJobCost === 0 || jobCost > maxJobCost) {
                                    maxJobCost = jobCost;
                                }


                            }
                            jobResults[workunit.extractionResults[extractionResult].crowdFlowerJobId] = '"' + workunit.extractionResults[extractionResult].crowdFlowerJobName + '",' + workunit.extractionResults[extractionResult].crowdFlowerUnitId + ',' + workunit.extractionResults[extractionResult].judgmentCount + ',' + jobCost + ',' + getDateTime(dStart) + ',' + getDateTime(dEnd) + ',' + dDiff + ',EXTRACTION,';
                        }
                    }

                }
            }

            //taxonomy results
            var taxonomyResult;
            for (taxonomyResult in workunit.taxonomyResults) {
                if (workunit.taxonomyResults.hasOwnProperty(taxonomyResult)) {
                    if (header[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId]) {
                        if (!taxonomyJobs[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId] && countFinishedCrowdFlowerJobs !== (countExtractionJobs + countClassificationJobs)) {
                            isTaxonomy = true;
                            taxonomyJobs[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId] = workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId;
                            countTaxonomyJobs++;

                            //come back and fix costs for master jobs....
                            dStart = new Date(workunit.evaluationContext["J" + workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId + "_startTime"]);
                            dEnd = new Date(workunit.evaluationContext["J" + workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId + "_endTime"]);
                            dDiff = Math.floor((dEnd - dStart) / 60000);

                            if (workunit.taxonomyResults[taxonomyResult].crowdFlowerJobName.indexOf('Master') > -1) {
                                countMasterJobs++;
                                //jobCost = 0;
                                //overallCost = overallCost - workunit.taxonomyResults[taxonomyResult].cost;
                            } else {
                                if (workunit.classificationResults[classificationResult].crowdFlowerJobName.indexOf('Validate') > -1) {
                                    countExpertJobs++;
                                }
                                countJobsForCalcs++;
                                jobCost = workunit.taxonomyResults[taxonomyResult].cost;
                                taxonomyCost = taxonomyCost + jobCost;
                                if (dDiff) {
                                    averageTotalTime = averageTotalTime + dDiff;
                                }
                                averageTotalCost = averageTotalCost + jobCost;
                                if (minJobTime === 0 || dDiff < minJobTime) {
                                    minJobTime = dDiff;
                                }
                                if (maxJobTime === 0 || dDiff > maxJobTime) {
                                    maxJobTime = dDiff;
                                }
                                if (minJobCost === 0 || jobCost < minJobCost) {
                                    minJobCost = jobCost;
                                }
                                if (maxJobCost === 0 || jobCost > maxJobCost) {
                                    maxJobCost = jobCost;
                                }


                            }
                            jobResults[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId] = '"' + workunit.taxonomyResults[taxonomyResult].crowdFlowerJobName + '",' + workunit.taxonomyResults[taxonomyResult].crowdFlowerUnitId + ',' + workunit.taxonomyResults[taxonomyResult].judgmentCount + ',' + jobCost + ',' + getDateTime(dStart) + ',' + getDateTime(dEnd) + ',' + dDiff + ',TAXONOMY,';
                        }
                    }
                }
            }



            reportOutput = reportOutput + totalTime + ',' + averageTotalTime / countJobsForCalcs + ',' + minJobTime + ',' + maxJobTime + ',' + averageTotalCost + ',';
            reportOutput = reportOutput + (countExtractionJobs + countClassificationJobs + countTaxonomyJobs) + ',' + averageTotalCost / countJobsForCalcs + ',' + minJobCost + ',' + maxJobCost + ',' + classificationCost + ',' + taxonomyCost + ',' + extractionCost + ',';
            //write the counts here
            reportOutput = reportOutput + countInProgressCrowdFlowerJobs + "," + isTaxonomy + "," + countClassificationJobs + "," + countTaxonomyJobs + "," + countExtractionJobs + "," + countMasterJobs + "," + countExpertJobs + ",";

            //then loop through the header and add remainders
            /*for (var job in header) {
                if (jobResults[job]) {
                    reportOutput = reportOutput + jobResults[job];
                }
                else
                {
                    reportOutput = reportOutput + ",,,,,,,,";
                }
            }*/
            reportOutput = reportOutput + "\n";
//            }
        });

        var writeReportStream = fs.createWriteStream('workunit_report_minor.csv');
        writeReportStream.write(reportOutput);

        writeReportStream.on("end", function () {
            writeReportStream.end();
        });
        console.log('done');


    }
]);


