/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the startup script for Engrafa Integration Manager UI web server.
 *
 * @version 1.2
 * @author albertwang, j3_guile, TCSASSEMBLER
 *
 * Changes in 1.1:
 * 1. merge webServer and apiServer
 *
 * Changes in 1.2:
 * - Updated the configuration file path.
 */
"use strict";

var config = require('../config');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var url = require('url');
var winston = require('winston');
var send = require('send');
var favicon = require('serve-favicon');
var apiController = require('./controllers/APIController');
var workflowIntegrationConfigurationAdminController = require('./controllers/WorkflowIntegrationConfigurationAdminController');
var userAdminController = require('./controllers/UserAdminController');
var clientAPIConfigurationAdminController = require('./controllers/ClientAPIConfigurationAdminController');
var clientUserController = require('./controllers/ClientUserController');
var workUnitController = require('./controllers/WorkUnitController');
var reportsController = require('./controllers/ReportsController');
var authentication = require('./services/AuthenticationService');

// Initialize server
var express = require('express');
var bodyParser = require('body-parser');
var app = exports.app = express();
app.use(require('cors')());
app.use(bodyParser.json());
app.use(favicon(__dirname + '/favicon.ico'));
authentication.configure(app);

// Set routes
app.get('/api/api/results', authentication.authenticateApiClient, apiController.filterTransformedResults);
app.post('/api/api/resultImportStatuses', authentication.authenticateApiClient, apiController.updateTransformedResultsImportStatus);

app.get('/api/auth', authentication.checkAuthentication);
app.post('/api/auth', authentication.authenticate);
app.delete('/api/auth', authentication.logout);

app.post('/api/workflowIntegrationConfigurations', authentication.requiresAuthentication, authentication.requiresAdmin, workflowIntegrationConfigurationAdminController.createWorkflowIntegrationConfiguration);
app.get('/api/workflowIntegrationConfigurations', authentication.requiresAuthentication, authentication.requiresAdmin, workflowIntegrationConfigurationAdminController.getWorkflowIntegrationConfigurations);
app.delete('/api/workflowIntegrationConfigurations/:id', authentication.requiresAuthentication, authentication.requiresAdmin, workflowIntegrationConfigurationAdminController.removeWorkflowIntegrationConfiguration);
app.post('/api/workflowIntegrationConfigurations/:id/transformationRules', authentication.requiresAuthentication, authentication.requiresAdmin, workflowIntegrationConfigurationAdminController.addWorkflowTransformationRule);
app.delete('/api/workflowIntegrationConfigurations/:workflowId/transformationRules/:id', authentication.requiresAuthentication, authentication.requiresAdmin, workflowIntegrationConfigurationAdminController.removeWorkflowTransformationRule);
app.post('/api/workflowIntegrationConfigurations/:id/mappingRules', authentication.requiresAuthentication, authentication.requiresAdmin, workflowIntegrationConfigurationAdminController.addWorkflowMappingRule);
app.delete('/api/workflowIntegrationConfigurations/:workflowId/mappingRules/:id', authentication.requiresAuthentication, authentication.requiresAdmin, workflowIntegrationConfigurationAdminController.removeWorkflowMappingRule);

app.post('/api/users', authentication.requiresAuthentication, authentication.requiresAdmin, userAdminController.createUser);
// change the name to make sure that when executing 'Refresh' (F5) in the page it is redirected to "/" like in all other pages
app.get('/api/users', authentication.requiresAuthentication, userAdminController.getUsers);
app.delete('/api/users/:id', authentication.requiresAuthentication, authentication.requiresAdmin, userAdminController.removeUser);
app.put('/api/users/:id', authentication.requiresAuthentication, authentication.requiresAdmin, userAdminController.updateUser);
app.put('/api/users/:id/password', authentication.requiresAuthentication, authentication.requiresAdmin, userAdminController.updateUserPassword);
app.put('/api/resetPassword', authentication.requiresAuthentication, userAdminController.resetCurrentUserPassword);

app.post('/api/clientAPIConfigurations', authentication.requiresAuthentication, authentication.requiresAdmin, clientAPIConfigurationAdminController.createClientAPIConfiguration);
app.get('/api/clientAPIConfigurations', authentication.requiresAuthentication, authentication.requiresAdmin, clientAPIConfigurationAdminController.getClientAPIConfigurations);
app.delete('/api/clientAPIConfigurations/:id', authentication.requiresAuthentication, authentication.requiresAdmin, clientAPIConfigurationAdminController.removeClientAPIConfiguration);
app.put('/api/clientAPIConfigurations/:id', authentication.requiresAuthentication, authentication.requiresAdmin, clientAPIConfigurationAdminController.updateClientAPIConfiguration);

app.get('/api/transformedResults', authentication.requiresAuthentication, clientUserController.searchTransformedResults);
app.get('/api/transformedResults/:id', authentication.requiresAuthentication, clientUserController.getTransformedResult);
app.put('/api/transformedResults/:id', authentication.requiresAuthentication, clientUserController.updateTransformedResult);
app.get('/api/transformedConfiguration/:type', authentication.requiresAuthentication, clientUserController.getTransformedConfiguration);
app.put('/api/transformedResultStatus/:id', authentication.requiresAuthentication, clientUserController.updateTransformedResultStatus);

// get WorkUnits
app.get('/api/workUnit/:id', authentication.requiresAuthentication, workUnitController.getWorkUnit);
// update WorkUnits
app.put('/api/workUnit/:id', authentication.requiresAuthentication, workUnitController.updateWorkUnit);

app.get('/api/reports', authentication.requiresAuthentication, reportsController.getReports);
app.get('/api/reports/download/:fileName', authentication.requiresAuthentication, reportsController.downloadReport);
app.get('/api/reports/:id', authentication.requiresAuthentication, reportsController.getReportDetails);
app.post('/api/reports/cancel', authentication.requiresAuthentication, reportsController.cancelReport);
app.post('/api/reports/execute', authentication.requiresAuthentication, reportsController.executeReport);
app.put('/api/reports/:id', authentication.requiresAuthentication, reportsController.updateReport);

app.use(function (err, req, res, next) {//jshint ignore:line
    if (err.name === 'ValidationError') {
        res.status(400).json(err);
    } else {
        res.status(err.status || 500).json({message: err.message || 'Unable to process request.'});
    }
});

app.use(function (req, res, next) {
    var parsedUrl = url.parse(req.url);
    var requestPath = parsedUrl.path;
    var indexDir = __dirname + '/angular';
    if (!requestPath) {
        requestPath = '/views/index.html';
    }
    send(req, requestPath).root(indexDir).on('error', function () {
        req.url = '/views/index.html';
        return next();
    }).pipe(res);
}, express.static(__dirname + '/angular', {index: '/views/index.html'}));

if (!module.parent) {

    if (config.WEB_SERVER_HTTPS_PORT) {
        var httpsOptions;
        // Try different key formats.
        if (config.WEB_SERVER_HTTPS_PRIVATE_KEY_FILE && config.WEB_SERVER_HTTPS_CERTIFICATE_FILE) {
            httpsOptions = {
                key: fs.readFileSync(path.join(__dirname, config.WEB_SERVER_HTTPS_PRIVATE_KEY_FILE)),
                cert: fs.readFileSync(path.join(__dirname, config.WEB_SERVER_HTTPS_CERTIFICATE_FILE)),
            };
        } else if (config.WEB_SERVER_HTTPS_PFX_FILE) {
            httpsOptions = {
                pfx: fs.readFileSync(path.join(__dirname, config.WEB_SERVER_HTTPS_PFX_FILE)),
            };
        } else {
            winston.error('No certificate found!');
            throw 'No certificate found!';
        }

        // HTTPS server
        https.createServer(httpsOptions, app).listen(config.WEB_SERVER_HTTPS_PORT, function () {
            winston.info("Express server listening on port %d in %s mode",
                config.WEB_SERVER_HTTPS_PORT,
                app.settings.env);
        });

        // An internal HTTP handler to redirect requests to the HTTPS server.
        var redirectToHttps = function (req, res) {
            var parsedUrl = url.parse(req.url);
            var hostAndPort = req.headers.host;
            var host;
            if (hostAndPort) {
                // HTTP 1.1
                host = hostAndPort.split(':')[0];
            } else {
                // HTTP 1.0
                host = parsedUrl.hostname;
            }
            if (host) {
                var search = parsedUrl.search || '';
                var redirectTo = 'https://' + host + ':' + config.WEB_SERVER_HTTPS_PORT + parsedUrl.pathname + search;
                res.writeHead(301, {'Location': redirectTo});
            } else {
                // HTTP 1.0 without a host
                res.writeHead(404);
            }
            res.end();
        };
        http.createServer(redirectToHttps).listen(config.WEB_SERVER_HTTP_PORT, function () {
            winston.info("Redirection server listening on port %d in %s mode",
                config.WEB_SERVER_HTTP_PORT,
                app.settings.env);
        });
    } else {
        // Fallback to HTTP protocol
        http.createServer(app).listen(config.WEB_SERVER_HTTP_PORT, function () {
            winston.info("Express server listening on port %d in %s mode",
                config.WEB_SERVER_HTTP_PORT,
                app.settings.env);
        });
    }
}
