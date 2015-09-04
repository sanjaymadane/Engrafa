/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the startup script for Engrafa Document Manager worker.
 * This script is supposed to be started using Node.js "forever" CLI module.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

var documentService = require('./services/DocumentService');
var config = require('./config');

// Schedule jobs
setInterval(
    function () {
        config.refreshBoxAccessToken(function (err) {
            if (err) {
                // log error
                console.log('DocumentService#refreshBoxAccessToken. Error:' + err);
            }
        });
    },
    config.REFRESH_BOX_ACCESS_TOKEN_JOB_INTERVAL
);

setInterval(
    function () {
        documentService.pullNewDocuments(function (err) {
            if (err) {
                // log error
                console.log('DocumentService#pullNewDocuments. Error:' + err);
            }
        });
    },
    config.PULL_NEW_DOCUMENTS_JOB_INTERVAL
);

setInterval(
    function () {
        documentService.processDocuments(function (err) {
            if (err) {
                // log error
                console.log('DocumentService#processDocuments. Error:' + err);
            }
        });
    },
    config.PROCESS_DOCUMENTS_JOB_INTERVAL
);

setInterval(
    function () {
        documentService.convertDocuments(function (err) {
            if (err) {
                // log error
                console.log('DocumentService#convertDocuments. Error:' + err);
            }
        });
    },
    config.CONVERT_DOCUMENTS_JOB_INTERVAL
);

setInterval(
    function () {
        documentService.checkDocumentConversionStatus(function (err) {
            if (err) {
                // log error
                console.log('DocumentService#checkDocumentConversionStatus. Error:' + err);
            }
        });
    },
    config.CHECK_DOCUMENT_CONVERSION_STATUS_JOB_INTERVAL
);

/*
setInterval(
    function () {
        documentService.scaleDocumentProcessors(function (err) {
            if (err) {
                // log error
                console.log('DocumentService#scaleDocumentProcessors. Error:' + err);
            }
        });
    },
    config.SCALE_DOCUMENT_PROCESSORS_JOB_INTERVAL
);
*/

setInterval(
    function () {
        documentService.pullTrapezeLicenseUsageLogs(function (err) {
            if (err) {
                // log error
                console.log('DocumentService#pullTrapezeLicenseUsageLogs. Error:' + err);
            }
        });
    },
    config.PULL_CVISION_TRAPEZE_LICENSE_USAGE_LOGS_JOB_INTERVAL
);
