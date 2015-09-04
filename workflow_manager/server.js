/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the startup script for API and frontend pages.
 *
 * @version 1.0
 * @author Sky_
 */
"use strict";


var express = require('express');
var path = require('path');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cookieSession = require('cookie-session');
var ejs = require('ejs');
var http = require('http');
var _ = require('underscore');
var winston = require('winston');
var config = require("../config");
var auth = require('http-auth');
var logger = require('morgan');
var app = express();

var Jobs = require('./controllers/Jobs');
var Settings = require('./controllers/Settings');
var Reports = require('./controllers/Reports');
var Data = require('./controllers/Data');

app.set('port', config.API_PORT);


var basic = auth.basic({
    realm: "Engrafa Admin",
    file: path.join(__dirname, "./config/users.htpasswd")
});

app.use(auth.connect(basic));
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({secret: 'app_1'}));
app.use(methodOverride());
app.set('views', path.join(__dirname, '/angular/views'));
app.engine('html', ejs.renderFile);

app.use(express.static(path.join(__dirname, 'angular')));

app.get('/api/jobs/internal', Jobs.getInternalJobs);
app.get('/api/settings', Settings.getSettings);
app.post('/api/settings/startService', Settings.startService);
app.post('/api/settings/stopService', Settings.stopService);
app.get('/api/settings/status', Settings.getServiceStatus);
app.get('/api/settings/log', Settings.getLogFile);
app.post('/api/settings/validate', Settings.validate);
app.post('/api/settings/saveWorkflow', Settings.saveWorkflow);
app.get('/api/reports', Reports.getReport);
app.get('/api/reports/work-units.csv', Reports.getWorkUnitCSV);
app.get('/api/reports/jobs.csv', Reports.getJobsCSV);
app.post('/api/data/search', Data.search);
app.post('/api/data/document/:id', Data.updateDocument);

app.all("/api/*", function (req, res) {
    res.send("Not found", 404);
});

//redirect all other routes to angular
app.get("*", function (req, res) {
    res.render("index.html");
});

//start the app
http.createServer(app).listen(app.get('port'), function () {
    winston.info('Express server listening on port ' + app.get('port'));
});
