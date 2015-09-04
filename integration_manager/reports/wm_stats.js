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
var header = {};

var reportOutput = "_id,docDate,url,fileName,processingPhase,isDone,docType,state,assessor-collector,startTime,endTime,totalTime,averageJobTime,minJobTime,maxJobTime,cost,countFinishedCrowdFlowerJobs,averageJobCost,minJobCost,maxJobCost,classificationCost,taxonomyCost,extractionCost,countInProgressCrowdFlowerJobs,isTaxonomy,countClassificationCrowdFlowerJobs,countTaxonomyCrowdFlowerJobs,countExtractionCrowdFlowerJobs,countMasterJobs,countExpertJobs,";

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


report.name = 'Statistics_WM_Report';

report.execute = function(outputFileName, callback) {
    var db = require("mongodb").connect('mongodb://localhost:27017/engrafa', function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('workunits').find({isDone:true}).toArray(function(err, workunits) {
            db.close();

            if (err || !workunits) {
                console.log("No workunits");
            } else {
        workunits.forEach(function(workunit) {
           // console.log(workunit)
            for(var finishedCrowdFlowerUnit in workunit.finishedCrowdFlowerUnits) {
                //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                header[workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId] = workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId;
               //console.log(header);
            }

        });
        /*for (var job in header) {
            //console.log(job)
            reportOutput = reportOutput + job + "_jobName," + job + "_unitId," + job + "_judgmentCount," + job + "_cost," + job + "_startTime," + job + "_endTime," + job + "_totalTime," + job + "_phase,";

        }*/
        reportOutput = reportOutput + "\n";

        //build content
        workunits.forEach(function(workunit) {
            //if (workunit.isDone == true) {
                if (true) {
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


                var docType = ""
                if (workunit.workflowId == "54aedb94e6c12b1c0e83394c") {docType = "RE Tax Bills"}
                else if (workunit.workflowId == "54aedb94e6c12b1c0e83389e") {docType = "PP Tax Bills"}
                else if (workunit.workflowId == "54aedb94e6c12b1c0e833860") {docType = "Return"}
                else if (workunit.workflowId == "54d52d54e579eb780f2dfe1a") {docType = "RE Notice"}
                else if (workunit.workflowId == "54d52d54e579eb780f2dfe68") {docType = "PP Notice"}              
                else if (workunit.workflowId == "54b2f62f14862b1c157fb013") {docType = "DEV"}
                if (workunit.evaluationContext.state) {
                    state = workunit.evaluationContext.state
                }
                if (workunit.evaluationContext.collectorname) {
                    assessorCollector = workunit.evaluationContext.collectorname
                }
                if (workunit.evaluationContext.assessorname) {
                    assessorCollector = workunit.evaluationContext.assessorname
                }
     
                    var docname = workunit.fileName
                    var docDate = "";
                    docname = docname.split("_")

                    for (var j = 0; j < docname.length; j++) {

                        if (docname[j].substring(0,4) == "2014" || docname[j].substring(0,4) == "2015" || docname[j].substring(0,4) == "2016") {
                            docDate = docname[j-2] + "/" + docname[j-1] + "/" + docname[j].substring(0,4)
                        }
                    }
          

               // console.log(workunit)
                reportOutput = reportOutput + workunit._id + ',';
                reportOutput = reportOutput + docDate + ',';
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
                var overallCost = workunit.cost;

                
                var countFinishedCrowdFlowerJobs = 0;
                var finishedCrowdFlowerUnits = {};
                for(var finishedCrowdFlowerUnit in workunit.finishedCrowdFlowerUnits) {
                    //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                    if (!finishedCrowdFlowerUnits[workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId]) { 
                        finishedCrowdFlowerUnits[workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId] = workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId;
                        countFinishedCrowdFlowerJobs++;
                    }   
                   //console.log(header);
                }

                var countInProgressCrowdFlowerJobs = 0;
                var inProgressCrowdFlowerUnits = {};
                for(var inProgressCrowdFlowerUnit in workunit.inProgressCrowdFlowerUnits) {
                    //console.log(workunit.finishedCrowdFlowerUnits[finishedCrowdFlowerUnit].crowdFlowerJobId)
                    if (!inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId]) { 
                        inProgressCrowdFlowerUnits[workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId] = workunit.inProgressCrowdFlowerUnits[inProgressCrowdFlowerUnit].crowdFlowerJobId;
                        countInProgressCrowdFlowerJobs++;
                    }   
                   //console.log(header);
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

                var jobResults = {};
                //classification results
                for(var classificationResult in workunit.classificationResults) {
                    if (header[workunit.classificationResults[classificationResult].crowdFlowerJobId]) { 
                        if (!classificationJobs[workunit.classificationResults[classificationResult].crowdFlowerJobId]) { 
                            classificationJobs[workunit.classificationResults[classificationResult].crowdFlowerJobId] = workunit.classificationResults[classificationResult].crowdFlowerJobId;
                            countClassificationJobs++;

                            //come back and fix costs for master jobs...
                            var jobCost;
                            var dStart = new Date(workunit.evaluationContext["J" + workunit.classificationResults[classificationResult].crowdFlowerJobId + "_startTime"]);
                            var dEnd = new Date(workunit.evaluationContext["J" + workunit.classificationResults[classificationResult].crowdFlowerJobId + "_endTime"] );
                            var dDiff = Math.floor((dEnd - dStart) / 60000);
                            if (dDiff < 0) {dDiff = 0};


                            if (workunit.classificationResults[classificationResult].crowdFlowerJobName.indexOf('Master') > -1) {
                                countMasterJobs++;
                                //jobCost = 0;
                                //overallCost = overallCost - workunit.classificationResults[classificationResult].cost;
                            }
                            else
                            {
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
                                if (minJobTime == 0 || dDiff < minJobTime) { 
                                    minJobTime = dDiff;
                                }
                                if (maxJobTime == 0 || dDiff > maxJobTime) {
                                    maxJobTime = dDiff;
                                }         
                                if (minJobCost == 0 || jobCost < minJobCost) { 
                                    minJobCost = jobCost;
                                }
                                if (maxJobCost == 0 || jobCost > maxJobCost) {
                                    maxJobCost = jobCost;
                                } 
     
                            }
                            jobResults[workunit.classificationResults[classificationResult].crowdFlowerJobId] = '"' + workunit.classificationResults[classificationResult].crowdFlowerJobName + '",' + workunit.classificationResults[classificationResult].crowdFlowerUnitId + ',' + workunit.classificationResults[classificationResult].judgmentCount + ',' + jobCost + ',' + getDateTime(dStart) + ',' + getDateTime(dEnd) + ',' + dDiff + ',CLASSIFICATION,';         
                            
                        }   
                    }   
                }
                //extraction results
                for(var extractionResult in workunit.extractionResults) {
                    if (header[workunit.extractionResults[extractionResult].crowdFlowerJobId]) { 
                        if (!extractionJobs[workunit.extractionResults[extractionResult].crowdFlowerJobId]) { 
                            extractionJobs[workunit.extractionResults[extractionResult].crowdFlowerJobId] = workunit.extractionResults[extractionResult].crowdFlowerJobId;
                            countExtractionJobs++;
                            //come back and fix costs for master jobs....
                            var jobCost;
                            var dStart = new Date(workunit.evaluationContext["J" + workunit.extractionResults[extractionResult].crowdFlowerJobId + "_startTime"]);
                            var dEnd = new Date(workunit.evaluationContext["J" + workunit.extractionResults[extractionResult].crowdFlowerJobId + "_endTime"] );                    
                            var dDiff = Math.floor((dEnd - dStart) / 60000);
                            if (dDiff < 0) {dDiff = 0};

                            if (workunit.extractionResults[extractionResult].crowdFlowerJobName.indexOf('Master') > -1) {
                                countMasterJobs++;
                                //jobCost = 0;
                                //overallCost = overallCost - workunit.extractionResults[extractionResult].cost;
                            }
                            else
                            {
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
                                if (minJobTime == 0 || dDiff < minJobTime) { 
                                    minJobTime = dDiff;
                                }
                                if (maxJobTime == 0 || dDiff > maxJobTime) {
                                    maxJobTime = dDiff;
                                }         
                                if (minJobCost == 0 || jobCost < minJobCost) { 
                                    minJobCost = jobCost;
                                }
                                if (maxJobCost == 0 || jobCost > maxJobCost) {
                                    maxJobCost = jobCost;
                                } 
                          
    
                            }
                            jobResults[workunit.extractionResults[extractionResult].crowdFlowerJobId] = '"' + workunit.extractionResults[extractionResult].crowdFlowerJobName + '",' + workunit.extractionResults[extractionResult].crowdFlowerUnitId + ',' + workunit.extractionResults[extractionResult].judgmentCount + ',' + jobCost + ',' + getDateTime(dStart) + ',' + getDateTime(dEnd) + ',' + dDiff + ',EXTRACTION,';        
                        }   
                    }   
                }


                //taxonomy results
                for(var taxonomyResult in workunit.taxonomyResults) {
                    if (header[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId]) { 
                        if (!taxonomyJobs[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId] && countFinishedCrowdFlowerJobs != (countExtractionJobs + countClassificationJobs)) { 
                            isTaxonomy = true;
                            taxonomyJobs[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId] = workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId;
                            countTaxonomyJobs++;

                            //come back and fix costs for master jobs....
                            var jobCost;
                            var dStart = new Date(workunit.evaluationContext["J" + workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId + "_startTime"]);
                            var dEnd = new Date(workunit.evaluationContext["J" + workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId + "_endTime"] );                    
                            var dDiff = Math.floor((dEnd - dStart) / 60000);
                            //because dup jobs
                            if (dDiff < 0) {dDiff = 0};

                            if (workunit.taxonomyResults[taxonomyResult].crowdFlowerJobName.indexOf('Master') > -1) {
                                countMasterJobs++;
                                //jobCost = 0;
                                //overallCost = overallCost - workunit.taxonomyResults[taxonomyResult].cost;
                            }
                            else
                            {
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
                                if (minJobTime == 0 || dDiff < minJobTime) { 
                                    minJobTime = dDiff;
                                }
                                if (maxJobTime == 0 || dDiff > maxJobTime) {
                                    maxJobTime = dDiff;
                                }         
                                if (minJobCost == 0 || jobCost < minJobCost) { 
                                    minJobCost = jobCost;
                                }
                                if (maxJobCost == 0 || jobCost > maxJobCost) {
                                    maxJobCost = jobCost;
                                }  
                                 
         
                            }
                            jobResults[workunit.taxonomyResults[taxonomyResult].crowdFlowerJobId] = '"' + workunit.taxonomyResults[taxonomyResult].crowdFlowerJobName + '",' + workunit.taxonomyResults[taxonomyResult].crowdFlowerUnitId + ',' + workunit.taxonomyResults[taxonomyResult].judgmentCount + ',' + jobCost + ',' + getDateTime(dStart) + ',' + getDateTime(dEnd) + ',' + dDiff + ',TAXONOMY,';         
                        }   
                    }   
                }



                reportOutput = reportOutput + totalTime + ',' + averageTotalTime/countJobsForCalcs + ',' + minJobTime + ',' + maxJobTime + ',' + averageTotalCost + ',';
                reportOutput = reportOutput + (countExtractionJobs + countClassificationJobs + countTaxonomyJobs) + ',' + (averageTotalCost)/countJobsForCalcs + ',' + minJobCost + ',' + maxJobCost + ',' + classificationCost + ',' + taxonomyCost + ',' + extractionCost + ',';
                //todo in progress counts
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
            }
        });

            }

            callback(null, reportOutput);
        });
    });
};

module.exports = report;
