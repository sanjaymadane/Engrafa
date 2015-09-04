/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the Maintenance workflow. It'll stop the instances, remove log files, backup database,
 * start the instances.
 *
 * @version 1.0
 * @author TCASSEMBLER
 */
var config = require('./config/config');
var CronJob = require('cron').CronJob;
var exec = require('child_process').exec;
var _ = require('underscore');
var fs = require('fs');
var s3 = require('s3');
var winston = require('winston');
var async = require('async');
var common = require("./common");

/**
 * Delete files in directory.
 * @param directoryPath the directory path to delete
 * @param callback the callback method
 */
function deleteFiles(directoryPath, callback) {
    async.waterfall([
        function (cb) {
            fs.readdir(directoryPath, cb);
        }, function (files, cb) {
            async.each(files, function(file, cb2) {

                var filePath = directoryPath + '/' + file;
                var lastModifiedTime = fs.statSync(filePath).mtime.getTime();
                var currentTime = new Date().getTime();

                if (currentTime - lastModifiedTime > config.LOG_FILES_REMAINED_TIME) {
                    fs.unlink(filePath, cb2);
                } else {
                    cb2();
                }
            }, function(err){
                if (err) {
                    winston.error('failed to delete log files in ' + directoryPath);
                }
                cb();
            });
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to delete log files in ' + directoryPath);
        }
        callback();
    });
}
/**
 * Delete all log files.
 * @param callback the callback method
 */
function deleteAllLogFiles(callback) {
    async.waterfall([
        function (cb) {
            deleteFiles(config.LOG_FILE_PATH_INTEGRATION_MANAGER, cb);
        }, function (cb) {
            deleteFiles(config.LOG_FILE_PATH_MIDDLEWARE_SERVICE, cb);
        }, function (cb) {
            deleteFiles(config.LOG_FILE_PATH_WORKFLOW_MANAGER, cb);
        }, function (cb) {
            deleteFiles(config.LOG_FILE_PATH_MAINTENANCE, cb);
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to delete log files:' + err);
        } else {
            winston.info('successfully to delete log files');
        }
        callback();
    });
}
/**
 * Backup database.
 * @param suffix the backup path suffix.
 * @param callback the callback function.
 */
function backupDatabase(suffix, callback) {
    async.waterfall([
        function (cb) {
            var workflowManagerCommand = config.MONGO_DUMP_COMMAND + ' --db ' + config.WORKFLOW_MANAGER_DB
                + ' --out ' + config.MONGO_DUMP_DIRECTORY + '/' + config.WORKFLOW_MANAGER_DB + '_' + suffix;
            common.executeCommand(workflowManagerCommand, false, cb);
        }, function (cb) {
            var integrationManagerCommand = config.MONGO_DUMP_COMMAND + ' --db ' + config.INTEGRATION_MANAGER_DB
                + ' --out ' + config.MONGO_DUMP_DIRECTORY + '/' + config.INTEGRATION_MANAGER_DB + '_' + suffix;
            common.executeCommand(integrationManagerCommand, false, cb);
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to dump databases:' + err);
        } else {
            winston.info('successfully dumped databases.');
        }
        callback();
    });
}
/**
 * Upload the files to S3.
 * @param sourcePath the source files path
 * @param prefix the directory prefix in S3.
 * @param callback the callback funtion.
 */
function uploadToS3(sourcePath, prefix, callback) {
    var client = s3.createClient({
        s3Options: {
            accessKeyId: config.S3_ACCESS_KEY_ID,
            secretAccessKey: config.S3_SECRET_ACCESS_KEY
        }
    });
    var params = {
        localDir: sourcePath,

        s3Params: {
            Bucket: config.S3_BUCKET,
            Prefix: prefix
        }
    };
    var uploader = client.uploadDir(params);
    uploader.on('error', function(err) {
        winston.error('failed to upload files to S3, detail: "' + err.stack + '"');
    });

    uploader.on('progress', function() {
        winston.info("progress: " + uploader.progressAmount + " of " + uploader.progressTotal);
    });

    uploader.on('end', function() {
        callback();
    });
}

/**
 * Upload all files to S3.
 * @param suffix the S3 directory suffix.
 * @param callback the callback function.
 */
function uploadAllFiles(suffix, callback) {
    async.waterfall([
        function (cb) {
            var path = config.MONGO_DUMP_DIRECTORY + '/' + config.WORKFLOW_MANAGER_DB + '_' + suffix;
            uploadToS3(path, config.WORKFLOW_MANAGER_DB  + '_' + suffix, cb);
        }, function (cb) {
            var path = config.MONGO_DUMP_DIRECTORY + '/' + config.INTEGRATION_MANAGER_DB + '_' + suffix;
            uploadToS3(path, config.INTEGRATION_MANAGER_DB + '_' + suffix, cb);
        }
    ], function done(err) {
        if (err) {
            winston.error('failed to upload files to S3.');
        } else {
            winston.info('successfully uploaded files to S3');
        }
        callback();
    });
}

/**
 * Run the workflow in cron.
 */
function runCron() {
    new CronJob(config.CRON_PATTERN, function() {
        var current = new Date();

        var backupTime = (1900 + current.getYear()) + '_' + (current.getMonth() + 1) + '_' + current.getDate()
            + '_' + current.getHours() + '_' + current.getMinutes();

        async.waterfall([
            function (cb) {
                common.stopAllInstances(cb);
            }, function (cb) {
                deleteAllLogFiles(cb);
            }, function (cb) {
                backupDatabase(backupTime, cb);
            }, function (cb) {
                uploadAllFiles(backupTime, cb);
            }, function (cb) {
                common.startAllInstances(cb);
            }
        ], function done(err) {
            if (err) {
                winston.error('failed to run the cron.');
            } else {
                winston.info('successfully run the cron.');
            }
        });

    }, null, true, config.CRON_TIMEZONE);
}
/**
 * Print help in console.
 */
function printHelp() {
    console.log('The command should be one of following:');
    console.log(' -- node Maintenance.js');
    console.log(' -- node Maintenance.js stopInstances');
    console.log(' -- node Maintenance.js deleteLogs');
    console.log(' -- node Maintenance.js startInstances');
    console.log(' -- node Maintenance.js dumpDatabases [prefix]');
    console.log(' -- node Maintenance.js uploadFiles [prefix]');
}

/**
 * Run the workflow based on input parameter.
 */
function parseArguments() {
    var args = process.argv.slice(2);
    if (args.length === 0) {
        runCron();
    } else if (args.length === 1) {
        if (args[0] === 'stopInstances') {
            common.stopAllInstances(function() {});
        } else if (args[0] === 'deleteLogs') {
            deleteAllLogFiles(function() {});
        } else if (args[0] === 'startInstances') {
            common.startAllInstances(function() {});
        } else {
            printHelp();
        }
    } else if (args.length === 2) {
        if (args[0] === 'dumpDatabases') {
            backupDatabase(args[1], function() {});
        } else if (args[0] === 'uploadFiles') {
            uploadAllFiles(args[1], function() {});
        } else {
            printHelp();
        }
    } else {
        printHelp();
    }
}

parseArguments();

