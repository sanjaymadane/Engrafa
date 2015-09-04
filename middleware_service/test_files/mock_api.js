/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the mocked ClientA Endpoint.
 *
 * @version 1.1
 * @author Sky_, vvpig
 *
 * changes in 1.1:
 * 1. Add mock SOAP server code.
 */
"use strict";

var soap = require('soap');
var winston = require('winston');
var http = require('http');
var fs = require('fs');
var path = require('path');
var libxml = require('libxmljs');

var wsdl = require('fs').readFileSync(path.join(__dirname, 'service.wsdl'), 'utf8');
var xsd = fs.readFileSync(path.join(__dirname, "../xsd/Document.xsd"), 'utf8');
var xsdDoc = libxml.parseXmlString(xsd);

var HTTP_PORT = 5050;

var myService = {
    DocumentIntegrationService: {
        DocumentIntegrationPort: {
            SubmitDocument: function (args) {
                var valid, xmlDoc;
                winston.info("Request body: %j", args, {});
                if (!args.documentXml) {
                    throw new Error("invalid request!");
                }
                var documentXml = args.documentXml;
                try {
                    xmlDoc = libxml.parseXmlString(documentXml);
                } catch (e) {
                    throw new Error("invalid xml");
                }
                valid = xmlDoc.validate(xsdDoc);
                var doc = new libxml.Document();
                var root = doc.node('ACK');
                root.node("TransactionID", String(new Date().getTime() % 1000));
                function tryGetValue(path) {
                    var ele = xmlDoc.get(path);
                    return ele ? ele.text() : "invalid";
                }
                //write pdf file with base64 string
                var documentFile = tryGetValue("//DocumentFile");
                fs.writeFileSync(path.join(__dirname, "/downloads/" + tryGetValue("//DocumentID") + '.pdf'), new Buffer(documentFile, "base64"));
                //write pdf end
                root.node("WorkflowName", tryGetValue("//WorkflowName"));
                root.node("DocumentID", tryGetValue("//DocumentID"));
                if (valid) {
                    winston.info("Document ok");
                    root.node("Status", "1");
                    root.node("StatusMessage", "OK");
                } else {
                    winston.info("Document invalid");
                    root.node("Status", "0");
                    root.node("StatusMessage", "Invalid XML");
                }
                root.node("Timestamp", new Date().toISOString());
                return {"SubmitDocumentResult": doc.toString()};
            }
        }
    }
};
var server = http.createServer(function (request, response) {
    response.end("test file");
});
server.listen(HTTP_PORT, function () {
    console.log("Middleware Mock API Server listening on port %d", HTTP_PORT);
});

var soapServer = soap.listen(server, '/DocumentIntegration', myService, wsdl);
soapServer.log = function (type, data) {
    // type is 'received' or 'replied'
    winston.info("type: ", type);
    winston.info("data: ", data);
};

