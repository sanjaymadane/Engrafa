/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This service provides methods to Client API configurations.
 *
 * @version 1.1
 * @author albertwang, j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";
var SERVICE = 'ClientAPIConfigurationService';

var _ = require('underscore');
var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var ClientAPIConfiguration = mongoose.model('ClientAPIConfiguration', require('../models/ClientAPIConfiguration').ClientAPIConfigurationSchema);

var validator = require("../helpers/validator");
var delegates = require('../helpers/DelegateFactory');

/**
 * Checks the given configuration for duplicate webhooks.
 * @param cac the configuration to check
 * @returns {boolean} true if there are multiple webhooks of the same type
 * @private
 */
function _hasDuplicateWebhooks(cac) {
    if (!cac || !cac.webhooks) {
        return false;
    }
    var counter = {}, i;
    for (i = 0; i < cac.webhooks.length; i++) {
        if (counter[cac.webhooks[i].type]) {
            return true;
        }
        counter[cac.webhooks[i].type] = true;
    }
    return false;
}

/**
 * Creates a new configuration.
 * @param {Object} cac the configuration to create
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) cac - the created configuration
 */
function createClientAPIConfiguration(cac, callback) {
    var error = validator.validateObject('cac', cac);
    if (!error && cac.webhooks && !_.isArray(cac.webhooks)) {
        error = validator.createError('webhooks', 'Webhooks must be an array.', '');
    }
    if (!error && _hasDuplicateWebhooks(cac)) {
        error = validator.createError('webhooks', 'Only one webhook per type is supported', '');
    }
    if (error) {
        return callback(error);
    }

    ClientAPIConfiguration.create(delegates.noIds(cac), callback);
}

/**
 * Updates an existing configuration.
 * @param {Object} cac the configuration to update
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) cac - the updated configuration
 */
function updateClientAPIConfiguration(cac, callback) {
    var error = validator.validateObject('cac', cac);
    if (!error && !validator.isValidObjectId(cac.id)) {
        error = validator.createError('id', 'Not a valid object identifier', cac.id);
    }
    if (!error && cac.webhooks && !_.isArray(cac.webhooks)) {
        error = validator.createError('webhooks', 'Webhooks must be an array.', '');
    }
    if (!error && _hasDuplicateWebhooks(cac)) {
        error = validator.createError('webhooks', 'Only one webhook per type is supported', '');
    }
    if (error) {
        return callback(error);
    }

    ClientAPIConfiguration.findById(cac.id, function (err, existing) {
        if (err) {
            return callback(err);
        }

        if (!existing) {
            return callback({ status: 404, message: 'Configuration not found'});
        }

        _.extend(existing, _.pick(cac, 'clientId', 'authenticationKey', 'webhooks'));
        existing.save(delegates.spliceArgs(callback, 1));
    });
}

/**
 * Deletes web client API configuration.
 * @param {String} id the configuration id to be deleted
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeClientAPIConfiguration(id, callback) {
    var error = validator.validateObjectId('id', id);
    if (error) {
        return callback(error);
    }
    ClientAPIConfiguration.findByIdAndRemove(id, delegates.noArgs(callback));
}

/**
 * Retrieves all client API configurations.
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) cacs - all configurations
 */
function getClientAPIConfigurations(callback) {
    ClientAPIConfiguration.find({}, callback);
}

module.exports = {
    createClientAPIConfiguration: delegates.service(SERVICE, createClientAPIConfiguration, {input: ["cac"], output: ["cac"]}),
    updateClientAPIConfiguration: delegates.service(SERVICE, updateClientAPIConfiguration, {input: ["cac"], output: ["cac"]}),
    removeClientAPIConfiguration: delegates.service(SERVICE, removeClientAPIConfiguration, {input: ["id"], output: []}),
    getClientAPIConfigurations: delegates.service(SERVICE, getClientAPIConfigurations, {input: [], output: ["cacs"]})
};