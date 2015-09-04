/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the configuration for API routes.
 *
 * @version 1.0
 * @author Sky_
 */
"use strict";

module.exports = {
    "GET /api/jobs/internal": "Jobs#getInternalJobs",

    "GET /api/settings": "Settings#getSettings",
    "POST /api/settings/startService": "Settings#startService",
    "POST /api/settings/stopService": "Settings#stopService",
    "GET /api/settings/status": "Settings#getServiceStatus",
    "GET /api/settings/log": "Settings#getLogFile",
    "POST /api/settings/validate": "Settings#validate",
    "POST /api/settings/saveWorkflow": "Settings#saveWorkflow",

    //TEMP FIX, It crushes app
    "GET /api/reports": "Reports#getReport",
    "GET /api/reports/work-units.csv": "Reports#getWorkUnitCSV",
    "GET /api/reports/jobs.csv": "Reports#getJobsCSV",

    "POST /api/data/search": "Data#search",
    "POST /api/data/document/:id": "Data#updateDocument"
};