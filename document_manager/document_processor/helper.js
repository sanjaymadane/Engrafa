/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the helper methods for logging.
 *
 * @version 1.0
 * @author arvind81983
 */
"use strict";

var logger = require('./Logger');

module.exports = {
    /**
     * Refresh Box access token.
     * @param callback: the callback function
     * @returns None
     */
    Log: function (LogStatement, callback) {
        try {
            logger.debug(LogStatement);
        } catch (e) {
            callback(e);
        }
    }
};
