/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * This is the controller that exposes AJAX actions for workunit.
 *
 * @version 1.0
 * @author shankar Kamble
 */
"use strict";

var service = require('../services/WorkunitService');
var transformationService = require('../services/ResultTransformationService');
var delegates = require('../helpers/DelegateFactory');
var CONTROLLER = 'workUnitController';
var async = require('async');
/**
 * Retrieves all Workunits objects.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) Workunit - available Workunit object
 */
function getWorkUnit(req, res, callback) {
    service.getWorkUnit(req.params.id, callback);
}

/**
 * Updates taxonomyResults and extractionResults of workUnit object 
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) workUnit - the updated object
 */
function updateWorkUnit(req, res, callback) {
    var workUnitData = req.body;
    async.waterfall([
        // Get the saved workunit 
        function (cb) {
            getWorkUnit(req, res, cb);
        },

        function (workUnit) {
            async.waterfall([
                // Change taxonomyResults,extractionResults,evaluationContext
                function (cb) {
                    workUnit.taxonomyResults = workUnitData.taxonomyResults;
                    workUnit.extractionResults = workUnitData.extractionResults;
                    workUnit.evaluationContext = workUnitData.evaluationContext;
                    service.saveWorkUnit(workUnit, cb);
                },
                function (workUnit, cb) {
                    // it will update document or create new one
                    service.saveDocument(workUnit, cb);
                },
                function (workUnit, cb) {
                    // Delete all related transformation results 
                    transformationService.deleteTransformedResultsByWorkUnit(req.params.id, cb);
                }

            ], function (err) {
                callback(err, workUnit);
            });
        },

    ], callback);
}


module.exports = {
    getWorkUnit: delegates.controller(CONTROLLER, getWorkUnit),
    updateWorkUnit: delegates.controller(CONTROLLER, updateWorkUnit)
};