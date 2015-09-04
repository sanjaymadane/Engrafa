/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This service provides methods to manage documents.
 *
 * Changes in version 1.1 (Engrafa Document Manager Mock API Challenge):
 * - Add the option to connect to mock EC2 API.
 *
 * Changes in version 1.2:
 * - Fix the issue with scaling EC2 instances and distributing documents to document processors.
 *
 * @version 1.2
 * @since 1.0
 * @author albertwang, arvind81983, duxiaoyang
 */
"use strict";

var mkdirp = require('mkdirp');
var path = require('path');
var config = require('../config');
var async = require('async');
var AWS = require('aws-sdk');
var mime = require('mime');
var request = require('superagent');
var mongoose = config.getMongoose();
var fs = require('fs');
var uuid = require('uuid');
var _ = require('underscore');
var random = require('mongoose-random');
var Document = mongoose.model('Document', require('../models/Document').DocumentSchema);
var ClientFolder = mongoose.model('ClientFolder', require('../models/ClientFolder').ClientFolderSchema);
var DocumentProcessor = mongoose.model('DocumentProcessor', require('../models/DocumentProcessor').DocumentProcessorSchema);
var DocumentStatus = require('../models/DocumentStatus');
var DocumentProcessorStatus = require('../models/DocumentProcessorStatus');
var Agent = require('agentkeepalive');
var documentService = require('./DocumentService');
var helper = require('../helper');
var winston = require('winston');
winston.level = 'debug';

/**
 * Get the URL of a document's HTML view.
 * @param fileId the Box file ID
 * @param callback the callback function
 * @return None
 */
exports.getDocumentHTMLViewURL = function (fileId, callback) {
    helper.Log("getDocumentHTMLViewURL called");

    async.waterfall([
        function (cb) {
            Document.findOne({ 'processedFileId' : fileId }, cb);
        },
        function (document, cb) {
            if (document) {
                if (document.status !== DocumentStatus.CONVERTED) {
                    // document has not been converted
                    callback(new Error("Document has not been converted to HTML."));
                } else {
                    // create a Box View API session
                    request.post(config.BOX_VIEW_API_BASE_URL + '/sessions')
                        .set('Authorization', 'Token ' + config.BOX_VIEW_API_KEY)
                        .send({ 'document_id': document.convertedDocumentId,
                            'duration': config.DOCUMENT_HTML_VIEW_TTL})
                        .end(function (err, res) {
                            if (err) {
                                helper.Log('Error Converting document to HTML for processedFileId: ' +
                                    fileId);
                                winston.error(err);
                                cb(err);
                            } else {
                                if (res.ok) {
                                    helper.Log('Session created for viewing converted HTML: ' + document.fileName);
                                    cb(null, res);
                                } else {
                                    helper.Log('Error Converting document to HTML for processedFileId: ' +
                                        fileId);
                                    helper.Log(res);
                                    cb(new Error("session not created"));
                                }
                            }
                        });
                }
            } else {
                helper.Log('No document found with processedFileId: ' + fileId);
            }
        },
        function (res, cb) {
            if (res.txt !== "") {
                helper.Log('Url found for file with converted fileId: ' + fileId);
                callback(null, JSON.parse(res.text).urls.view);
            } else {
                helper.Log('No url found for file with converted fileId: ' + fileId);
                cb(new Error("Url not for file with converted fileId: " + fileId));
            }
        }
    ], callback);
};

/**
 * Enqueue a document for processing.
 * @param clientFolder the client folder from which the document is fetched
 * @param fileId the Box file ID of the document
 * @param fileName the file name
 * @param callback the callback function
 * @return None
 */
exports.enqueueDocument = function (clientFolder, fileId, fileName, callback) {
    helper.Log("enqueueDocument called");
    Document.create({'originalFileId' : fileId,
        'fileName' : fileName,
        'clientFolderId' : clientFolder.id,
        'status' : DocumentStatus.QUEUED,
        'created' : Date.now()
        }, callback);
};

/**
 * Process a document.
 * @param document the document to process
 * @param documentProcessor the document processor
 * @param callback the callback function
 * @return None
 */
exports.processDocument = function (document, documentProcessor, callback) {
    helper.Log("processDocument called");

    var ext = path.extname(document.fileName);
    var type = mime.lookup(ext);
    var originalFilename = config.DOCUMENT_PROCESSING_DIRECTORY + "/" + uuid.v4() + ext;
    // var originalFileStream = fs.createWriteStream(originalFilename);
    var processedFilename = config.DOCUMENT_PROCESSING_DIRECTORY + "/"; //+ uuid.v4() + ext;
    // var processedFileStream = fs.createWriteStream(processedFilename);

    var keepaliveAgent = new Agent({
        keepAlive: true,
        keepAliveMsecs: config.DOCUMENT_PROCESSOR_KEEPALIVE_TIME
    });

    // We have to do this because of a bug in superagent
    // that does not handle encoded files properly. Check this link:
    // https://github.com/visionmedia/superagent/issues/147 for more details
    request.parse.binary = function (res, fn) {
        res.text = '';
        res.setEncoding('binary');
        res.on('data', function (chunk) {
            res.text += chunk.toString('binary');
        });
        res.on('end', fn);
    };

    async.waterfall([
        // Update status
        function (cb) {
            helper.Log("update status to PROCESSING");
            document.status = DocumentStatus.PROCESSING;
            document.save(cb);
        },
        // Update Document Processor workload
        function (document, count, cb) {
            helper.Log("update workload and lastUsedTimestamp");
            documentProcessor.lastUsedTimestamp = Date.now();
            documentProcessor.workload++;
            documentProcessor.save(cb);
        },
        // Download original file
        function (documentProcessor, count, cb) {
            helper.Log("download file called");
            // We have to do this because of a bug in superagent
            // We override the default parser for "type"
            if (!request.parse.hasOwnProperty(type)) {
                request.parse[type] = request.parse.binary;
            }

            request.get(config.BOX_CONTENT_API_BASE_URL + '/files/' + document.originalFileId + '/content')
                .set('Authorization', 'Bearer ' + config.getBoxAccessToken())
                .buffer(true)
                .end(function (err, res) {
                    if (err) {
                        helper.Log("download file error: " + err);
                        cb(new Error("res error: " + res.text));
                    } else {
                        if (res.ok) {
                            var encoding = 'utf-8',
                                text = new Buffer(res.text, 'binary');
                            fs.writeFile(originalFilename, text, encoding, function (error) {
                                if (error) {
                                    helper.Log("file write error: " + error);
                                    cb(error);
                                } else {
                                    helper.Log("The file was downloaded from Box: " + document.fileName);
                                    cb();
                                }
                            });
                        } else {
                            helper.Log("Unable to download file from Box. Error status code:" + res.status);
                            cb();
                        }
                    }
                });
        },
        // Send to Document Processor for processing
        function (cb) {
            var url = "http://" + documentProcessor.address + ":" +
                config.DOCUMENT_PROCESSOR_PORT +
                config.DOCUMENT_PROCESSOR_URL_SUFFIX;
            helper.Log("send file called");
            helper.Log("originalFilename: " + originalFilename);
            helper.Log("will post to: " + url);
            request.post(url)
                .attach('inputFile', originalFilename, document.fileName)
                .agent(keepaliveAgent)
                .buffer(true)
                .end(function (err, res) {
                    if (err) {
                        helper.Log("error processing file: " + originalFilename);
                        helper.Log("perhaps the instance isn't ready yet? Instance address:" +
                            documentProcessor.address);
                        cb(err, document);
                    } else {
                        helper.Log('Document processor selected: ' + documentProcessor.address);
                        // var contentData = null;
                        // if (res.text && res.text !== "") {
                        //     contentData = res.text;
                        // } else {
                        //     contentData = res.body;
                        // }
                        var encoding = 'utf-8',
                            text = new Buffer(res.text, 'binary');
                        processedFilename += document.fileName;
                        fs.writeFile(processedFilename, text, encoding, function (error) {
                            if (error) {
                                helper.Log("Error writing the file to disk: " + document.fileName);
                                cb(error);
                            } else {
                                helper.Log("The file was processed and downloaded from " +
                                    "document processor: " + document.fileName);
                                cb();
                            }
                        });
                    }
                });
        },
        // Upload processed file to Box
        function (cb) {
            helper.Log("processed file name: " + processedFilename);
            // Upload processed file
            ClientFolder.findById(document.clientFolderId, function (err, clientFolder) {
                request.post(config.BOX_UPLOAD_URL)
                    .set('Authorization', 'Bearer ' + config.getBoxAccessToken())
                    .field('parent_id', clientFolder.outputFolderId)
                    .attach('file', processedFilename)
                    .end(function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            if (res.ok) {
                                helper.Log('Uploaded file after processing: ' + processedFilename);
                            } else {
                                if (res.status === 409) {
                                    helper.Log('Error: File already exists with name: ' + processedFilename);
                                } else {
                                    helper.Log("Upload error: " + res.text);
                                }
                            }
                            cb(null, res);
                        }
                    });
            });
        },
        // Update document status
        function (res, cb) {
            helper.Log("update status called");
            if (res.body && res.body.entries && res.body.entries[0]) {
                helper.Log('Updating document status to PROCESSED: ' + document.fileName);
                document.processedFileId = res.body.entries[0].id;
                document.status = DocumentStatus.PROCESSED;
                document.save(cb);
            } else {
                helper.Log("Error updating status to PROCESSED");
                cb(new Error("Error updating status to PROCESSED"));
            }
        },
        // Update Document Processor workload
        function (document, count, cb) {
            helper.Log('Decremented Workload of document processor: ' + documentProcessor.address);
            documentProcessor.workload--;
            documentProcessor.save(cb);
        },
        // Remove original file from Box
        function (documentProcessor, count, cb) {
            request.del(config.BOX_CONTENT_API_BASE_URL + '/files/' + document.originalFileId)
                .set('Authorization', 'Bearer ' + config.getBoxAccessToken())
                .end(function (err, res) {
                    if (err) {
                        helper.Log("delete box error: ");
                        helper.Log(res);
                        cb(new Error("delete box error: " + res));
                    } else {
                        helper.Log('Deleted original file from Box: ' + document.fileName);
                        cb(null, res);
                    }
                });
        },
        // Remove local temporary files
        function (res, cb) {
            helper.Log("remove local files called");
            fs.unlink(originalFilename);
            fs.unlink(processedFilename);
            cb();
        }
    ], function (err, document) {
        helper.Log("process document end");
        if (err) {
            // rollback status
            if (document) {
                helper.Log('Error processing document, so rolling back status: ' + document.fileName);
                winston.error(err);
                document.status = DocumentStatus.QUEUED;
                document.save();
                if (documentProcessor) {
                    documentProcessor.lastUsedTimestamp = Date.now();
                    documentProcessor.workload--;
                    documentProcessor.save(callback);
                } else {
                    callback();
                }
            } else {
                callback();
            }
        } else {
            helper.Log("processing document success");
            callback();
        }
    });
};

/**
 * Convert a document to HTML.
 * @param document the document to convert
 * @param callback the callback function
 * @return None
 */
exports.convertDocumentToHTML = function (document, callback) {
    helper.Log("convertDocumentToHTML called");
    async.waterfall([
        // Update status
        function (cb) {
            helper.Log("upload document for conversion");
            // Upload document to Box View API for conversion

            helper.Log("processedFileId: " + document.processedFileId);
            if (document.processedFileId) {
                request.get(config.BOX_CONTENT_API_BASE_URL + '/files/' + document.processedFileId + '/content')
                    .set('Authorization', 'Bearer ' + config.getBoxAccessToken())
                    .buffer(true)
                    .end(function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            if (res.redirects && res.redirects[0]) {
                                var redirectUrl = res.redirects[0];
                                request.post(config.BOX_VIEW_API_BASE_URL + '/documents')
                                    .set('Authorization', 'Token ' + config.BOX_VIEW_API_KEY)
                                    .send({ 'url': redirectUrl })
                                    .end(function (err, res) {
                                        if (err) {
                                            helper.Log("conversion upload error");
                                            helper.Log(res);
                                            cb(new Error("convertDocument post error"));
                                        } else {
                                            helper.Log('Converting document to HTML: ' + document.fileName);
                                            cb(null, res);
                                        }
                                    });
                            } else {
                                helper.Log("Unable to fetch file url from Box. Error status code:" + res.status);
                                cb();
                            }
                        }
                    });

            }
        },
        function (res, cb) {
            helper.Log("update converted document id");
            var convertedDocumentId = JSON.parse(res.text).id;
            helper.Log("id: " + convertedDocumentId);
            helper.Log(res.text);
            document.convertedDocumentId = convertedDocumentId;
            document.save(cb);
        },
        function (document, count, cb) {
            helper.Log('Updated status of converted document to CONVERTING: ' + document.fileName);
            document.status = DocumentStatus.CONVERTING;
            document.save(cb);
        }
    ], function (err, document) {
        if (err) {
            // rollback status
            if (document) {
                helper.Log("error converting document");
                document.status = DocumentStatus.PROCESSED;
                document.save(callback);
            }
            callback();
        } else {
            helper.Log("success converting document");
            callback(err, document);
        }
    });
};

/**
 * Pull new files from Box input folder,
 * create a document for each file and enqueue the documents.
 * @param callback the callback function
 * @return None
 */
exports.pullNewDocuments = function (callback) {
    helper.Log("pullNewDocuments called");
    ClientFolder.find({}, function (err, clientFolders) {
        helper.Log("client folders found: " + clientFolders.length);
        async.forEach(clientFolders, function (clientFolder, cb) {
            request.get(config.BOX_CONTENT_API_BASE_URL + '/folders/' + clientFolder.inputFolderId + '/items')
                .query({ fields : 'id,name'})
                .query({ limit : config.BOX_FILE_RETRIEVAL_BATCH_SIZE })
                .set('Authorization', 'Bearer ' + config.getBoxAccessToken())
                .end(function (err, res) {
                    if (err) {
                        callback(err);
                    } else {
                        helper.Log("res: ");
                        helper.Log(res.body);
                        if (!res.ok) {
                            helper.Log('Invalid access token. Wait for it to regenerate');
                        } else {
                            async.forEach(res.body.entries, function (file, cb) {
                                Document.find({ originalFileId: file.id }, function (err, document) {
                                    if (err || !document.length) {
                                        // not enqueued yet
                                        helper.Log('Pulled and enqueued document: ' + file.name);
                                        documentService.enqueueDocument(
                                            clientFolder,
                                            file.id,
                                            file.name,
                                            cb
                                        );
                                    } else {
                                        cb();
                                    }
                                });
                            }, cb);
                        }
                    }
                });
        }, callback);
    });
};

/**
 * Process documents queued for processing.
 * @param callback the callback function
 * @return None
 */
exports.processDocuments = function (callback) {
    helper.Log("processDocuments called");
    Document.find({ 'status' : DocumentStatus.QUEUED }, function (err, documents) {
        if (err) {
            callback(err);
        } else {
            documentService.scaleDocumentProcessors(function (err) {
                if (err) {
                    helper.Log("error scaling processors");
                    helper.Log(err);
                    callback(err);
                } else {
                    helper.Log("processing documents");
                    // Select a document processor with least workload
                    DocumentProcessor.find({ 'status': DocumentProcessorStatus.RUNNING }).sort('workload').exec(function (err, documentProcessors) {
                        var availableProcessors = [];
                        if (documentProcessors.length == 0) {
                            callback(new Error('No available document processor'));
                        } else {
                            for (var i = 0; i < documentProcessors.length; i++) {
                                if (documentProcessors[i].workload < config.DOCUMENT_PROCESSOR_MAX_WORKLOAD) {
                                    for (var j = documentProcessors[i].workload; j < config.DOCUMENT_PROCESSOR_MAX_WORKLOAD; j++) {
                                        availableProcessors.push(documentProcessors[i]);
                                    }
                                }
                            }
                            if (availableProcessors.length == 0) {
                                callback(new Error('All document processors are currently overloaded'));
                            } else {
                                if (documents.length > availableProcessors.length) {
                                    documents = documents.slice(0, availableProcessors.length);
                                }
                                async.forEach(documents, function (document, cb) {
                                    documentService.processDocument(document, availableProcessors.shift(), cb);
                                }, callback);
                            }
                        }
                    });
                }
            });
        }
    });
};

/**
 * Convert documents that are processed but not converted.
 * @param callback the callback function
 * @return None
 */
exports.convertDocuments = function (callback) {
    helper.Log("convertDocuments called");
    Document.find({ 'status' : DocumentStatus.PROCESSED }, function (err, documents) {
        if (err) {
            callback(err);
        } else {
            async.forEach(documents, function (document, cb) {
                documentService.convertDocumentToHTML(document, cb);
            }, callback);
        }
    });
};

/**
 * Check documents conversion status.
 * The document status will be updated to 'CONVERTED' if the conversion completed.
 * @param callback the callback function
 * @return None
 */
exports.checkDocumentConversionStatus = function (callback) {
    helper.Log("checkDocumentConversionStatus called");
    Document.find({ 'status' : DocumentStatus.CONVERTING }, function (err, documents) {
        if (err) {
            callback(err);
        } else {
            async.forEach(documents, function (document, cb) {
                helper.Log("checking status for " + document.fileName + " cdid " + document.convertedDocumentId);
                // check document status
                if (document.convertedDocumentId) {
                    request.get(config.BOX_VIEW_API_BASE_URL + '/documents/' + document.convertedDocumentId)
                        .set('Authorization', 'Token ' + config.BOX_VIEW_API_KEY)
                        .end(function (err, res) {
                            if (err) {
                                helper.Log("error checking document status");
                                cb(err);
                            } else {
                                helper.Log("success checking document status");
                                if (res.status === 200) {
                                    helper.Log("conversion done");
                                    document.status = DocumentStatus.CONVERTED;
                                    document.save(function (err, document) {
                                        if (err) {
                                            helper.Log('Error: updating status of converted document to CONVERTED');
                                            winston.error(err);
                                            cb(err);
                                        } else {
                                            helper.Log('Updated status of converted document to CONVERTED: '
                                                + document.fileName);
                                            cb(null);
                                        }
                                    });
                                } else {
                                    helper.Log("conversion not done");
                                    helper.Log("convesrion: ");
                                    helper.Log(res.body);
                                    cb(null);
                                }
                            }
                        });
                }
            }, callback);
        }
    });
};

/**
 * Scale Document Processors deployed on AWS EC2.
 * @param callback the callback function
 * @return None
 */
exports.scaleDocumentProcessors = function (callback) {
    helper.Log("scaleDocumentProcessors called");

    // configure AWS security tokens
    AWS.config.update({accessKeyId: config.DOCUMENT_PROCESSOR_EC2_ACCESS_KEY,
        secretAccessKey: config.DOCUMENT_PROCESSOR_EC2_SECRET_KEY});

    // Set your region for future requests.
    AWS.config.update({region: config.DOCUMENT_PROCESSOR_EC2_REGION});
    var ec2 = null;
    if (config.DOCUMENT_PROCESSOR_EC2_MOCK) {
        ec2 = new AWS.EC2({endpoint : new AWS.Endpoint(config.DOCUMENT_PROCESSOR_EC2_MOCK_ENDPOINT)});
    } else {
        ec2 = new AWS.EC2();
    }

    function checkEc2Instance(id, callback) {
        helper.Log("checking ec2 instance");
        ec2.describeInstances({InstanceIds : [id]}, function (err, data) {
            if (err) {
                helper.Log("error describing instance " + id);
                helper.Log(err);
                callback(new Error("error describing instance" + id));
            } else {
                helper.Log("instance checked");
                helper.Log(data.Reservations[0].Instances[0].State.Name);
                if (data.Reservations[0].Instances[0].State.Name === 'pending') {
                    setTimeout(function () {
                        checkEc2Instance(id, callback);
                    }, 1000);
                } else {
                    callback(null, data.Reservations[0].Instances[0]);
                }
            }
        });
    }

    async.waterfall([
        // Check if there are documents queued for too long, or too many documents are queued
        function (cb) {
            async.parallel([
                // Query queued document count
                function (cb) {
                    Document.find({ 'status' : DocumentStatus.QUEUED }).count(cb);
                },
                // Query number of documents queued for too long
                function (cb) {
                    Document.find({ 'status' : DocumentStatus.QUEUED,
                        'created' : { $lt :
                            Date.now() - config.DOCUMENT_QUEUE_WAITING_TIME_THRESHOLD }}).count(cb);
                },
                // Query available processing capacity
                function (cb) {
                    DocumentProcessor.find({ 'status': { $in: [DocumentProcessorStatus.RUNNING, DocumentProcessorStatus.PENDING] }, 'workload': { $lt: config.DOCUMENT_PROCESSOR_MAX_WORKLOAD } },
                        function (err, documentProcessors) {
                            var capacity = 0;
                            for (var i = 0; i < documentProcessors.length; i++) {
                                capacity += config.DOCUMENT_PROCESSOR_MAX_WORKLOAD - documentProcessors[i].workload;
                            }
                            cb(null, capacity);
                        }
                    );
                }
            ], function (err, results) {
                if ((results[0] > config.DOCUMENT_QUEUE_THRESHOLD || results[1] > 0) && (results[0] - config.DOCUMENT_QUEUE_THRESHOLD > results[2] || results[1] > results[2])) {
                    async.waterfall([
                        // Find a stopped DocumentProcessor
                        function (cb) {
                            DocumentProcessor.findOne({ 'status' : DocumentProcessorStatus.NOT_RUNNING },
                                function (err, documentProcessor) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        if (documentProcessor) {
                                            // Start the stopped one
                                            helper.Log("found a stopped processor. starting...");
                                            var params = {InstanceIds: [documentProcessor.ec2InstanceId]};
                                            ec2.startInstances(params, function (err, data) {
                                                if (!err) {
                                                    documentProcessor.status = DocumentProcessorStatus.PENDING;
                                                    documentProcessor.save(function (err) {
                                                        if (err) {
                                                            cb(err);
                                                        } else {
                                                            // check EC2 instance status
                                                            checkEc2Instance(documentProcessor.ec2InstanceId, function (err, res) {
                                                                if (err) {
                                                                    helper.Log("error checking status");
                                                                    cb(new Error("error checking instance status"));
                                                                } else {
                                                                    if (res.State.Name === 'running') {
                                                                        documentProcessor.status = DocumentProcessorStatus.RUNNING;
                                                                        documentProcessor.address = res.PublicDnsName;
                                                                        documentProcessor.lastUsedTimestamp = Date.now();
                                                                        documentProcessor.save(cb);
                                                                    } else {
                                                                        console.log("stopped instance is started but is not running");
                                                                        cb(new Error("stopped instance is started but is not running"));
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    helper.Log('Error while ' +
                                                        'starting document processor: ' + err);
                                                    cb(err);
                                                }
                                            });
                                            cb();
                                        } else {
                                            helper.Log("there is no stopped processor, checking for a starting one");
                                            // Find a pending DocumentProcessor
                                            DocumentProcessor.findOne({'status': DocumentProcessorStatus.PENDING},
                                                function (err, documentProcessor) {
                                                    if (err) {
                                                        cb(err);
                                                    } else {
                                                        if (documentProcessor) {
                                                            // if there is one then wait for it to start running
                                                            cb();
                                                        } else {
                                                            helper.Log("there is no stopped processor, starting a new one");
                                                            // Launch new instances
                                                            ec2.runInstances(config.DOCUMENT_PROCESSOR_EC2, function (err, data) {
                                                                if (!err) {
                                                                    helper.Log("start instance request success");
                                                                    helper.Log(data);

                                                                    var ec2Instance = data.Instances[0];
                                                                    var doc = {
                                                                        status: DocumentProcessorStatus.PENDING,
                                                                        ec2InstanceId: ec2Instance.InstanceId,
                                                                        workload: 0,
                                                                        lastUsedTimestamp: Date.now()
                                                                    };
                                                                    DocumentProcessor.create(doc, function (err, documentProcessor) {
                                                                        if (err) {
                                                                            cb(err);
                                                                        } else {
                                                                            checkEc2Instance(ec2Instance.InstanceId, function (err, res) {
                                                                                if (err) {
                                                                                    helper.Log("error checking instance status");
                                                                                    helper.Log(err);
                                                                                    cb(new Error("error checking instance status"));
                                                                                } else {
                                                                                    if (res.State.Name === 'running') {
                                                                                        helper.Log("instance created and started");
                                                                                        documentProcessor.status = DocumentProcessorStatus.RUNNING;
                                                                                        documentProcessor.address = res.PublicDnsName;
                                                                                        documentProcessor.lastUsedTimestamp = Date.now();
                                                                                        documentProcessor.save(cb);
                                                                                    } else {
                                                                                        helper.Log("instance created but status is wrong: ");
                                                                                        helper.Log(res);
                                                                                        cb();
                                                                                    }
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                } else {
                                                                    console.log("can not create instance");
                                                                    console.log(err);
                                                                    cb(new Error("can not create instance"));
                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                        }
                                    }
                                });
                        }
                    ], cb);
                } else {
                    cb();
                }
            });
        },
        // Find document processors idled for max-allowed time
        function (documentProcessor, count, cb) {
            if (!cb) {
                if (count) {
                    cb = count;
                } else {
                    cb = documentProcessor;
                }
            }

            DocumentProcessor.find({ 'status' : DocumentProcessorStatus.RUNNING, 'workload' : 0,
                'lastUsedTimestamp' : { $lt :
                    Date.now() - config.DOCUMENT_PROCESSOR_MAX_IDLE_TIME } }, cb);
        },
        // Stop these processors
        function (documentProcessors, cb) {
            if (documentProcessors && documentProcessors.length > 0) {
                var params = {InstanceIds: _.pluck(documentProcessors, 'ec2InstanceId')};
                ec2.stopInstances(params, function (err, data) {
                    if (!err) {
                        async.forEach(documentProcessors, function (documentProcessor, cb) {
                            helper.Log('Document processor stopped at ' +
                                'instance: ' + documentProcessor.address);
                            documentProcessor.status = DocumentProcessorStatus.NOT_RUNNING;
                            documentProcessor.save(cb);
                        }, function (err) {
                            if (err) {
                                cb(err);
                            }
                            cb();
                        });
                    } else {
                        helper.Log('Error while stopping instances');
                        cb();
                    }
                });
                cb();
            } else {
                cb();
            }
        },
        // Find document processors idled for max-allowed time for termination
        function (cb) {
            helper.Log("searching for processors to terminate");
            DocumentProcessor.find({ 'status' : 'NOT_RUNNING',
                'lastUsedTimestamp' : {
                    $lt : Date.now() - config.DOCUMENT_PROCESSOR_MAX_IDLE_TIME_FOR_TERMINATION
                } }, cb);
        },
        // Terminate these processors
        function (documentProcessors, cb) {
            helper.Log("terminating unused processors");
            //helper.Log(documentProcessors);
            if (documentProcessors.length === 0) {
                cb(null);
            } else {
                ec2.terminateInstances({
                    InstanceIds : _.pluck(documentProcessors, 'ec2InstanceId')
                }, function (err, data) {
                    if (!err) {
                        async.forEach(documentProcessors, function (documentProcessor, cb) {
                            helper.Log('Document processor terminated at ' +
                                'instance: ' + documentProcessor.address);
                            documentProcessor.remove(cb);
                        }, cb);
                    } else {
                        helper.Log("error terminating unused instances");
                        cb(new Error("error terminating unused instances"));
                    }
                });
            }
        }
    ], callback);
};

/**
 * Pull latest Trapeze usage log of a document processor.
 * @param documentProcessor the document processor
 * @param callback the callback function
 * @return None
 */
exports.pullTrapezeLicenseUsageLog = function (documentProcessor, callback) {
    var logDirectory = config.CVISION_TRAPEZE_LICENSE_USAGE_LOGS_DIRECTORY
        + "/" + documentProcessor.ec2InstanceId;
    var logFile = logDirectory + "/licUsage.log";

    mkdirp(logDirectory, function (err) {
        if (!err) {
            var logFileStream = fs.createWriteStream(logFile);
            var req = request.get("http://" + documentProcessor.address
                + ":" + config.DOCUMENT_PROCESSOR_PORT
                + config.CVISION_TRAPEZE_LICENSE_USAGE_LOG_URL_SUFFIX);
            req.on('error', function (err) {
                helper.Log("download usage log error: ");
                helper.Log(err);
                callback(new Error("Error: " + err));
            });
            req.pipe(logFileStream);
            helper.Log('Pulling Trapeze license usage log licUsage.log from instance ');
            req.end(callback);
        } else {
            helper.Log("Error creating folder path: " + logDirectory);
            callback(new Error("Error creating folder path: " + logDirectory));
        }
    });
};

/**
 * Pull latest Trapeze usage log of running document processors.
 * @param callback the callback function
 * @return None
 */
exports.pullTrapezeLicenseUsageLogs = function (callback) {
    DocumentProcessor.find({ 'status' : DocumentProcessorStatus.RUNNING }, function (err, documentProcessors) {
        if (err) {
            callback(err);
        } else {
            async.forEach(documentProcessors, documentService.pullTrapezeLicenseUsageLog);
        }
    });
};
