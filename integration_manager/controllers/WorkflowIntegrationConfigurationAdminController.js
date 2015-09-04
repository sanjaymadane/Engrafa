/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the controller that exposes AJAX actions for workflow integration configuration administration.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var service = require('../services/WorkflowIntegrationConfigurationService');
var delegates = require('../helpers/DelegateFactory');
var CONTROLLER = 'WorkflowIntegrationConfigurationController';

/**
 * Creates a new WorkflowIntegrationConfiguration from the request body.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) wic - the created object
 */
function createWorkflowIntegrationConfiguration(req, res, callback) {
    service.createWorkflowIntegrationConfiguration(req.body, callback);
}

/**
 * Retrieves all WorkflowIntegrationConfiguration objects.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) wics - all available WorkflowIntegrationConfiguration objects
 */
function getWorkflowIntegrationConfigurations(req, res, callback) {
    service.getWorkflowIntegrationConfigurations(callback);
}

/**
 * Deletes a WorkflowIntegrationConfiguration.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeWorkflowIntegrationConfiguration(req, res, callback) {
    service.removeWorkflowIntegrationConfiguration(req.params.id, callback);
}

/**
 * Adds a new WorkflowTransformationRule from the request body.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformationRule - the added object
 */
function addWorkflowTransformationRule(req, res, callback) {
    service.addWorkflowTransformationRule(req.params.id, req.body, callback);
}

/**
 * Deletes a WorkflowTransformationRule.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeWorkflowTransformationRule(req, res, callback) {
    service.removeWorkflowTransformationRule(req.params.workflowId, req.params.id, callback);
}

/**
 * Adds a new WorkflowMappingRule from the request body.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) mappingRule - the added object
 */
function addWorkflowMappingRule(req, res, callback) {
    service.addWorkflowMappingRule(req.params.id, req.body, callback);
}

/**
 * Deletes a WorkflowMappingRule.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeWorkflowMappingRule(req, res, callback) {
    service.removeWorkflowMappingRule(req.params.workflowId, req.params.id, callback);
}

module.exports = {
    createWorkflowIntegrationConfiguration: delegates.controller(CONTROLLER, createWorkflowIntegrationConfiguration),
    getWorkflowIntegrationConfigurations: delegates.controller(CONTROLLER, getWorkflowIntegrationConfigurations),
    removeWorkflowIntegrationConfiguration: delegates.controller(CONTROLLER, removeWorkflowIntegrationConfiguration),
    addWorkflowTransformationRule: delegates.controller(CONTROLLER, addWorkflowTransformationRule),
    removeWorkflowTransformationRule: delegates.controller(CONTROLLER, removeWorkflowTransformationRule),
    addWorkflowMappingRule: delegates.controller(CONTROLLER, addWorkflowMappingRule),
    removeWorkflowMappingRule: delegates.controller(CONTROLLER, removeWorkflowMappingRule)
};