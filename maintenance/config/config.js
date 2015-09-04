/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the Maintenance module configurations.
 *
 * @version 1.0
 * @author TCASSEMBLER
 */
"use strict";

module.exports = {
    // The cron pattern
    CRON_PATTERN: '0 */3 * * * *',

    CRON_TIMEZONE: 'America/Los_Angeles',

    // The log files modified time to remove
    LOG_FILES_REMAINED_TIME: 1000, // 1 second for test, it should use 1000 * 60 * 60 * 24 * 7 (7 days),

    SHUTDOWN_JOB_INTERVAL : 10000,

    // Forever related configuration
    STOP_ENGRAFA_SERVICE_APP_COMMAND: 'forever -p ./logs --killSignal=SIGINT stop EngrafaServiceApp',
    STOP_WORKER_COMMAND: 'forever -p ./logs --killSignal=SIGINT stop worker',
    STOP_APP_COMMAND: 'forever -p ./logs --killSignal=SIGINT stop app',
    STOP_WEB_SERVER_COMMAND: 'forever -p ./logs stop server',
    START_ENGRAFA_SERVICE_APP_COMMAND: 'forever -p ./logs --sourceDir ../workflow_manager --workingDir ../workflow_manager start -a --uid "EngrafaServiceApp" EngrafaServiceApp.js',
    START_WORKER_COMMAND: 'forever -p ./logs --sourceDir ../integration_manager --workingDir ../integration_manager start -a --uid "worker" worker.js',
    START_APP_COMMAND: 'forever -p ./logs --sourceDir ../middleware_service --workingDir ../middleware_service start -a --uid "app" app.js',
    START_WEB_SERVER_COMMAND: 'forever -p ./logs --sourceDir ../integration_manager --workingDir ../integration_manager start -a --uid "server" server.js',

    // The log files path
    LOG_FILE_PATH_INTEGRATION_MANAGER: '../integration_manager/logs',
    LOG_FILE_PATH_MIDDLEWARE_SERVICE: '../middleware_service/logs',
    LOG_FILE_PATH_WORKFLOW_MANAGER: '../workflow_manager/logs',
    LOG_FILE_PATH_MAINTENANCE: './logs',

    // Mongodb related configuration
    MONGO_DUMP_COMMAND: '"D:/Program Files/MongoDB/Server/3.0/bin/mongodump" --host 192.168.1.101 --port 27017',
    MONGO_DUMP_DIRECTORY: './backup',
    INTEGRATION_MANAGER_DB: 'engrafaim-test',
    WORKFLOW_MANAGER_DB: 'engrafa-test',

    // S3 related configuration
    S3_ACCESS_KEY_ID: 'AKIAIY4VUJ5JMDVRAEAQ',
    S3_SECRET_ACCESS_KEY: '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',
    S3_BUCKET: 'engrafatest'
};
