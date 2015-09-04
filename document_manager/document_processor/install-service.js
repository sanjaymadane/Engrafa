/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Install Document Processor Service.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'Document Processor Service',
    description: 'The document processor service.',
    script: 'D:\\TopCoder\\Assembly\\Engrafa Document Manager\\FF1\\Document Processor\\server.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function () {
    svc.start();
});

svc.install();