/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the startup script for Engrafa Document Manager server.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

var config = require('./config');
var documentManagerController = require('./controllers/DocumentManagerController');

// Initialize server
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require("http");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.set('port', config.SERVER_PORT);

// Set routes
app.get('/documents/:fileId/html', documentManagerController.viewDocumentAsHTML);


// Start up server
http.createServer(app).listen(app.get('port'));
console.log('Server started at port: ' + app.get('port'));