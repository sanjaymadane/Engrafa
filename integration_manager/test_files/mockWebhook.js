/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Test webhook.
 *
 * @version 1.0
 * @author j3_guile
 */
'use strict';
var helper = require('./helper');

// create a simple server that returns 'ok'.
function createHook(onInvoke) {
    return require('http').createServer(function (req, res) {
        if (onInvoke) {
            onInvoke();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok" : true}');
    });
}

// create a simple server that returns 'ok'.
exports.createHook = createHook;

if (!module.parent) {
    createHook().listen(helper.HOOK_PORT);
}