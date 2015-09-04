/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 *  This service provides methods to manage workunit
 *
 * @version 1.1
 * @author Shankar Kamble
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";
var SERVICE = 'WorkunitService';
var config = require('../../config');
var _ = require('underscore');
var async = require('async');
var mongoose = config.getWorkflowManagerMongoose();
var WorkUnit = mongoose.model('WorkUnit',
    require('../models/workflow_manager/WorkUnit').WorkUnitSchema);
var Document = mongoose.model('Document', require('../models/workflow_manager/Document').DocumentSchema);
var delegates = require("../helpers/DelegateFactory");
var validator = require("../helpers/validator");
/**
 * Retrieves WorkUnit by id.
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) WorkUnit - work unit
 */
function getWorkUnit(id, callback) {
    WorkUnit.findOne({
        _id: id
    }, callback);
}


/**
 * Save Work unit object.
 * @param {workUnit} workUnit the result object to process
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) saveResult - the saved workUnit
 */
function saveWorkUnit(workUnit, callback) {
    var error = validator.validateType('workUnit', workUnit, 'WorkUnit');
    if (error) {
        return callback(error);
    }
    workUnit.save(function (err, saveResult) {
        callback(err, saveResult);
    });
}

/**
 * Merge all Classification result fields as the filter for Document
 * @param {WorkUnit} workUnit the work unit
 * @returns {Object} the mongodb search object
 * @private
 */
function _getDocumentClassificationFilter(workUnit) {
    var filter = {};
    // Merge all Classification result fields as the filter for Document
    _.each(workUnit.classificationResults, function (result) {
        _.each(result.fields, function (field) {
            filter["data." + field.name] = field.value;
        });
    });
    return filter;
}

/**
 * Mark document as read and update data to taxonomyResults
 * @param {WorkUnit} workUnit the work unit
 * @param {Function<err>} callback the callback function
 */
function saveDocument(workUnit, callback) {
    if (!workUnit.taxonomyResults.length) {
        //do nothing, work unit was not in taxonomyResults
        callback();
        return;
    }
    var filter = _getDocumentClassificationFilter(workUnit);
    async.waterfall([
        function (cb) {
            Document.findOne(filter, cb);
        },
        function (document, cb) {
            if (!document) {
                //it can only happen if someone delete document from database or review/escalation task
                //changed classification fields
                //it's better to recreate a document
                document = new Document({});
            }

            _.extend(document.data, workUnit.evaluationContext);
            document.isReady = true;
            document.taxonomyResults = workUnit.taxonomyResults;
            document.markModified("data");
            document.markModified("taxonomyResults");
            document.save(cb);
        }
    ], callback(null, workUnit));
}



module.exports = {
    getWorkUnit: delegates.service(SERVICE, getWorkUnit, {
        input: ["id"],
        output: ["workUnit"]
    }),
    saveWorkUnit: delegates.service(SERVICE, saveWorkUnit, {
        input: ["workUnit"],
        output: ["workUnit"]
    }),
    saveDocument: delegates.service(SERVICE, saveDocument, {
        input: ["workUnit"],
        output: ["workUnit"]
    }),
};