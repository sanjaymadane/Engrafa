/*
 * Copyright (C) 2014, 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Test utility.
 *
 * @version 1.0
 * @author j3_guile
 */
'use strict';

var async = require('async');
var fs = require('fs');
var HOOK_PORT = 4240;
var libxml = require('libxmljs');
var apacheMd5 = require('apache-md5');

/**
 * Logs any errors for setup/cleanup functions
 * @param {String} signature the calling method
 * @param {Function} done the callback of the setup function
 */
function logError(signature, done) {
    return function (err) {
        if (err) {
            console.log('Error on ' + signature);
            console.log(err); // test cannot succeed
            throw err;
        }
        done();
    };
}

/**
 * Creates an authorization token for the given user/password combination.
 * @param user the username
 * @param pass the password
 * @returns {String} the authorization token
 */
function token(user, pass) {
    return 'Basic ' + new Buffer(user + ':' + pass).toString('base64');
}

/**
 * Provides default test credentials.
 * @returns {String} the default authorization token for WEB API calls
 */
function credentials() {
    return token('admin', 'admin');
}

/**
 * Clears the integration manager database.
 * @param mongoose the database connection
 * @param {Function} done will be called when the operation is complete
 */
function clear(mongoose, done) {
    var User = mongoose.model('User', require('../models/User').UserSchema);
    var WIC = mongoose.model('WorkflowIntegrationConfiguration',
        require('../models/WorkflowIntegrationConfiguration').WorkflowIntegrationConfigurationSchema);
    var CAC = mongoose.model('ClientAPIConfiguration',
        require('../models/ClientAPIConfiguration').ClientAPIConfigurationSchema);
    var TransformedResult = mongoose.model('TransformedResult',
        require('../models/TransformedResult').TransformedResultSchema);
    var WUCS = mongoose.model('WorkUnitCheckingStatus',
        require('../models/WorkUnitCheckingStatus').WorkUnitCheckingStatusSchema);
    async.forEach([User, WIC, CAC, TransformedResult, WUCS], function (model, cb) {
        model.remove({}, cb);
    }, logError('clear', done));
}

/**
 * Populates the integration manager database with test data.
 * @param mongoose the database connection
 * @param {Function} done will be called when the operation is complete
 */
function seed(mongoose, done) {
    var User = mongoose.model('User', require('../models/User').UserSchema);
    var WIC = mongoose.model('WorkflowIntegrationConfiguration', require('../models/WorkflowIntegrationConfiguration').WorkflowIntegrationConfigurationSchema);
    var CAC = mongoose.model('ClientAPIConfiguration', require('../models/ClientAPIConfiguration').ClientAPIConfigurationSchema);
    var TransformedResult = mongoose.model('TransformedResult', require('../models/TransformedResult').TransformedResultSchema);

    async.parallel([function (cb) {
        User.create({isAdmin: true, username: 'admin', clientId: '5433b9d504ab3d832ebf9c0d', hashedPassword: apacheMd5('admin') }, cb);
    }, function (cb) {
        User.create({isAdmin: false, username: 'test', clientId: 'test', hashedPassword: apacheMd5('test')}, cb);
    }, function (cb) {
        User.create({isAdmin: false, username: 'user1', clientId: 'test', hashedPassword: apacheMd5('user1')}, cb);
    }, function (cb) {
        User.create({isAdmin: false, username: 'client1', clientId: 'client1', hashedPassword: apacheMd5('client1')}, cb);
    }, function (cb) {
        WIC.create({workflowId: '544c65d4a892122a42b6f7f0'}, cb);
    }, function (cb) {
        WIC.create({workflowId: '544c65d4a892122a42b6f7ee'}, cb);
    }, function (cb) {
        CAC.create({ _id: '544c65d4a892122a42b6f700',
            clientId: '5433b9d504ab3d832ebf9c0d',
            authenticationKey: 'clientKey',
            webhooks: [
                {type: 'result_ready_for_import', url: 'http://localhost:' + HOOK_PORT + '/myhook'}
            ]}, cb);
    }, function (cb) {
        TransformedResult.create({
            _id: '5433b9d504ab3d832ebf9c0e',
            clientId: '5433b9d504ab3d832ebf9c0d',
            status: 'pending',
            clientName: 'test client',
            workUnitId: '544c65d4a892122a42b6f7f1',
            workflowId: '544c65d4a892122a42b6f7f0',
            url: "url",
            fields: [
                {name: 'validstate', value: 'Yes', confidence: 1, jobName: 'CLASSIFICATION_STATE_BASIC', importFailed: false},
                {name: 'state', value: 'NE edited', confidence: 1, jobName: 'CLASSIFICATION_STATE_BASIC', importFailed: false},
                {name: 'newField', value: 'NE some suffix', confidence: 1, jobName: 'CLASSIFICATION_STATE_BASIC', importFailed: false},
                {name: 'collectorname', value: 'TERRENCE GAFFY', confidence: 1, jobName: 'CLASSIFICATION_COLLECTOR_BASIC', importFailed: false},
                {name: 'state2', value: 'NE edited', confidence: -1, jobName: 'CLASSIFICATION_COLLECTOR_BASIC', importFailed: false}
            ]
        }, cb);
    }, function (cb) {
        TransformedResult.create({
            _id: '6433b9d504ab3d832ebf9c0e',
            clientId: '5433b9d504ab3d832ebf9c0d',
            status: 'ready_for_import',
            clientName: 'test client',
            workUnitId: '644c65d4a892122a42b6f7f1',
            workflowId: '644c65d4a892122a42b6f7f0',
            url: "url",
            fields: [
                {name: 'state', value: 'Yes', confidence: 1, jobName: 'CLASSIFICATION_STATE_BASIC', importFailed: false,
                    errorMessage: 'test'}
            ]
        }, cb);
    }, function (cb) {
        TransformedResult.create({
            _id: '7433b9d504ab3d832ebf9c0e',
            clientId: '7433b9d504ab3d832ebf9c0d',
            status: 'pending',
            clientName: 'test client 2',
            workUnitId: '744c65d4a892122a42b6f7f1',
            workflowId: '744c65d4a892122a42b6f7f0',
            url: "url",
            fields: [
                {name: 'state', value: 'Yes', confidence: 1, jobName: 'CLASSIFICATION_STATE_BASIC', importFailed: false}
            ]
        }, cb);
    }], logError('seed', done));
}

/**
 * Creates a function that resets the Integration Manager database.
 * @param mongoose the database connection
 * @returns {Function} the function that resets the database
 */
function reset(mongoose) {
    return function (done) {
        clear(mongoose, function (err) {
            if (err) {
                return done(err);
            }
            seed(mongoose, done);
        });
    };
}

/**
 * Clears the workflow manager data.
 * @param workflowMongoose the database connection
 * @param {Function} done will be called when the operation is complete
 */
function clearWorkflowManager(workflowMongoose, done) {
    var WorkUnit = workflowMongoose.model('WorkUnit', require('../models/workflow_manager/WorkUnit').WorkUnitSchema);
    var Client = workflowMongoose.model('Client', require('../models/workflow_manager/Client').ClientSchema);
    var Workflow = workflowMongoose.model('Workflow', require('../models/workflow_manager/Client').WorkflowSchema);
    async.forEach([WorkUnit, Workflow, Client], function (model, cb) {
        model.remove({}, cb);
    }, logError('clearWorkflowManager', done));
}

/**
 * Populates workflow manager test data.
 * @param workflowMongoose the database connection
 * @param {Function} done will be called when the operation is complete
 */
function seedWorkflowManager(workflowMongoose, done) {
    var WorkUnit = workflowMongoose.model('WorkUnit', require('../models/workflow_manager/WorkUnit').WorkUnitSchema);
    var Client = workflowMongoose.model('Client', require('../models/workflow_manager/Client').ClientSchema);

    async.waterfall([
        function (cb) {
            Client.create({
                _id: '5433b9d504ab3d832ebf9c0d',
                name: "ClientA",
                workflows: [
                    {
                        name: "standard",
                        input: 1,
                        output: 2,
                        taskGroups: [
                            {
                                "processingPhase": "CLASSIFICATION",
                                "name": "Property Tax Bill Classification General Task Group",
                                "entryCondition": "true",
                                "tasks": [
                                    {
                                        "entryCondition": "true",
                                        "crowdFlowerJobId": 3,
                                        "predecessors": [],
                                        "transformation": {
                                            "exec": [
                                                "if (state) $add.newField = state + ' some suffix'"
                                            ]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }, cb);
        },
        function (client, cb) {

            var xmlContent = fs.readFileSync(__dirname + '/result_xmls/test_1.xml', "utf8");
            // we add only the data that we need
            new WorkUnit({
                _id: '2',
                isDone: true,
                endTime: new Date(),
                resultXML: xmlContent,
                client: client,
                workflowId: '544c65d4a892122a42b6f7f0',
                url: 'tmp',
                fileName: 'tmp.xml',
                processingPhase: 'CLASSIFICATION'
            }).save(cb);
        }
    ], logError('seedWorkflowManager', done));

}

/**
 * Creates a function that resets the workflow manager database.
 * @param workflowMongoose the database connection
 * @returns {Function} the function that resets the data
 */
function resetWorkflowData(workflowMongoose) {
    return function (done) {
        clearWorkflowManager(workflowMongoose, function (err) {
            if (err) {
                return done(err);
            }
            seedWorkflowManager(workflowMongoose, done);
        });
    };
}

/**
 * Creates a function that clears the integration manager database.
 * @param mongoose the database connection
 * @returns {Function} the function that clears the database
 */
function purge(mongoose) {
    return function (done) {
        clear(mongoose, done);
    };
}

/**
 * Creates a function that clears the workflow manager database.
 * @param workflowMongoose the database connection
 * @returns {Function} the function that clears the database
 */
function purgeWorkflowData(workflowMongoose) {
    return function (done) {
        clearWorkflowManager(workflowMongoose, done);
    };
}

/**
 * Retrieves the user ID with the given username.
 * @param mongoose the database connection
 * @param username the name to search for
 * @param {Function} done will be called when the operation is complete, passing in the error and the result Id.
 */
function getUserId(mongoose, username, done) {
    var User = mongoose.model('User', require('../models/User').UserSchema);
    User.findOne({username: username}, function (err, user) {
        if (err) {
            return done(err);
        }
        return done(null, user.id);
    });
}

/**
 * Retrieves the WIC ID with the given workflow ID.
 * @param mongoose the database connection
 * @param workflowId the workflow ID to search for
 * @param {Function} done will be called when the operation is complete, passing in the error and the result Id.
 */
function getWicId(mongoose, workflowId, done) {
    var WIC = mongoose.model('WorkflowIntegrationConfiguration',
        require('../models/WorkflowIntegrationConfiguration').WorkflowIntegrationConfigurationSchema);
    WIC.findOne({workflowId: workflowId}, function (err, wic) {
        if (err) {
            return done(err);
        }
        return done(null, wic.id);
    });
}

/**
 * Creates a delegate that Parses the xml from the response content.
 * @param end the callback after parsing
 * @returns {Function} the created delegate
 */
function parseXML(end) {
    return function (res, fn) {
        res.text = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) { res.text += chunk; });
        res.on('end', function (err) {
            fn(err, libxml.parseXmlString(res.text));
            end(res);
        });
    };
}

module.exports = {
    reset: reset,
    resetWorkflowData: resetWorkflowData,
    purge: purge,
    purgeWorkflowData: purgeWorkflowData,
    credentials: credentials,
    getUserId: getUserId,
    getWicId: getWicId,
    token: token,
    parseXML : parseXML,
    HOOK_PORT: HOOK_PORT
};
