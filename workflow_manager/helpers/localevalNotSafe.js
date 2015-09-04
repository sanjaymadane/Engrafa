/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is not safe replacement for localeval module
 *
 * @version 1.0
 * @author  Sky_
 */

module.exports = function (code, context) {
    with (context) {
        return eval(code);
    }
};