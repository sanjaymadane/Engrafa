/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * This is the controller that exposes AJAX actions for ClientAPIConfiguration administration.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

var service = require('../services/ClientAPIConfigurationService');
var delegates = require('../helpers/DelegateFactory');
var CONTROLLER = 'ClientAPIConfigurationAdminController';

/**
 * Creates a new ClientAPIConfiguration from the request body.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) cac - the created object
 */
function createClientAPIConfiguration(req, res, callback) {
    service.createClientAPIConfiguration(req.body, callback);
}

/**
 * Retrieves all ClientAPIConfiguration objects.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) cacs - all available ClientAPIConfiguration objects
 */
function getClientAPIConfigurations(req, res, callback) {
    service.getClientAPIConfigurations(callback);
}

/**
 * Updates an existing ClientAPIConfiguration from the request body.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) cac - the created object
 */
function updateClientAPIConfiguration(req, res, callback) {
    service.updateClientAPIConfiguration(req.body, callback);
}

/**
 * Removes a ClientAPIConfiguration, if not found, it is simply ignored.
 *
 * @param {Object} req the expressJS request object
 * @param {Object} res the expressJS response object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeClientAPIConfiguration(req, res, callback) {
    service.removeClientAPIConfiguration(req.params.id, callback);
}

module.exports = {
    createClientAPIConfiguration: delegates.controller(CONTROLLER, createClientAPIConfiguration),
    getClientAPIConfigurations: delegates.controller(CONTROLLER, getClientAPIConfigurations),
    updateClientAPIConfiguration: delegates.controller(CONTROLLER, updateClientAPIConfiguration),
    removeClientAPIConfiguration: delegates.controller(CONTROLLER, removeClientAPIConfiguration)
};