/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the startup script for the document processor server.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

var config = require('./config');
var documentProcessingController = require('./controllers/DocumentProcessingController');
var http = require("http");

// Initialize server
var express = require('express');
var uuid = require('uuid');
var bodyParser = require('body-parser');
var app = express();
var multer = require('multer');
app.use(multer({dest: './uploads/'}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.set('port', config.SERVER_PORT);

// Set routes
app.post('/processDocument', documentProcessingController.processDocument);
app.get('/licenseUsageLogs', documentProcessingController.getTrapezeLicenseUsageLog);

// Start up server
http.createServer(app).listen(app.get('port'));
console.log('Server started at port: ' + app.get('port'));