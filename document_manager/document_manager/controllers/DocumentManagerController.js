/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the controller that exposes web services of Document Manager.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

var documentService = require('../services/DocumentService');

/**
 * Get the URL of a document's HTML view.
 * @param req the request
 * @param res the response
 * @param callback the callback function
 * @return None
 */
exports.viewDocumentAsHTML = function (req, res, callback) {
    // Get HTML view URL
    documentService.getDocumentHTMLViewURL(req.params.fileId, function (err, url) {
        if (err) {
            res.status(500).send('Document HTML view is not available.');
        } else {
            // redirect to view URL
            res.redirect(url);
        }
    });
};
