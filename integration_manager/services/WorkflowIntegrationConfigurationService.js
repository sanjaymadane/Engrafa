/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 *  This service provides methods to manage workflow integration configurations.
 *
 * @version 1.1
 * @author albertwang, j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";
var SERVICE = 'WorkflowIntegrationConfigurationService';

var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var WorkflowIntegrationConfiguration = mongoose.model('WorkflowIntegrationConfiguration',
    require('../models/WorkflowIntegrationConfiguration').WorkflowIntegrationConfigurationSchema);
var WorkflowTransformationRule = mongoose.model('WorkflowTransformationRule',
    require('../models/WorkflowTransformationRule').WorkflowTransformationRuleSchema);
var WorkflowMappingRule = mongoose.model('WorkflowMappingRule',
    require('../models/WorkflowMappingRule').WorkflowMappingRuleSchema);

var delegates = require("../helpers/DelegateFactory");
var validator = require("../helpers/validator");

/**
 * Utility method to retrieve the configuration given a workflow ID.
 * @param {String} workflowId the workflow identifier
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) wic - the matched WorkflowIntegrationConfiguration
 * @private
 */
function _getConfigurationByWorkflowId(workflowId, callback) {
    var error = validator.validateObjectId('workflowId', workflowId);
    if (error) {
        return callback(error);
    }

    WorkflowIntegrationConfiguration.findOne({ workflowId: workflowId }, function (err, wic) {
        if (err) {
            return callback(err);
        }
        if (!wic) {
            return callback({status: 404, message: 'No workflow integration configuration exists.'});
        }
        callback(null, wic);
    });
}

/**
 * Creates a WorkflowIntegrationConfiguration.
 *
 * @param {Object} wic the configuration to create
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) wic - the created object
 */
function createWorkflowIntegrationConfiguration(wic, callback) {
    var error = validator.validateObject('wic', wic);
    if (error) {
        return callback(error);
    }
    WorkflowIntegrationConfiguration.find({workflowId: wic.workflowId}, function (err, workflow) {
        if (workflow.length > 0) {
            return callback({status: 409, message: 'This workflow already exists.'});
        }
        WorkflowIntegrationConfiguration.create(delegates.noIds(wic), callback);
    });
}

/**
 * Retrieves all WorkflowIntegrationConfiguration objects.
 *
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) wics - all WorkflowIntegrationConfiguration objects
 */
function getWorkflowIntegrationConfigurations(callback) {
    WorkflowIntegrationConfiguration.find({}, callback);
}

/**
 * Deletes a WorkflowIntegrationConfiguration object.
 *
 * @param {String} the id of the object to be removed
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeWorkflowIntegrationConfiguration(id, callback) {
    var error = validator.validateObjectId('id', id);
    if (error) {
        return callback(error);
    }
    WorkflowIntegrationConfiguration.findByIdAndRemove(id, delegates.noArgs(callback));
}

/**
 * Adds a new WorkflowTransformationRule.
 *
 * @param {String} workflowId the workflow to associate the rule for
 * @param {Object} transformationRule the rule to create
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) transformationRule - the added object
 */
function addWorkflowTransformationRule(workflowId, transformationRule, callback) {
    var error = validator.validateObject('transformationRule', transformationRule);
    if (error) {
        return callback(error);
    }

    _getConfigurationByWorkflowId(workflowId, function (err, wic) {
        if (err) {
            return callback(err);
        }
        var rule = new WorkflowTransformationRule(transformationRule);
        wic.transformationRules.push(rule);
        wic.save(function (err) {
            callback(err, rule);
        });
    });
}

/**
 * Deletes a WorkflowTransformationRule.
 *
 * @param {String} workflowId the parent workflow identifier
 * @param {String} id the ID of the rule to delete
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeWorkflowTransformationRule(workflowId, id, callback) {
    var error = validator.validateObjectId('id', id);
    if (error) {
        return callback(error);
    }

    _getConfigurationByWorkflowId(workflowId, function (err, wic) {
        if (err) {
            return callback(err);
        }

        var match = wic.transformationRules.id(id);
        if (!match) {
            return callback();
        }
        match.remove();
        wic.save(delegates.noArgs(callback));
    });
}

/**
 * Adds a new WorkflowMappingRule.
 *
 * @param {String} workflowId the workflow to associate the rule for
 * @param {Object} mappingRule the rule to create
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) mappingRule - the added object
 */
function addWorkflowMappingRule(workflowId, mappingRule, callback) {
    var error = validator.validateObject('mappingRule', mappingRule);
    if (error) {
        return callback(error);
    }

    _getConfigurationByWorkflowId(workflowId, function (err, wic) {
        if (err) {
            return callback(err);
        }
        var index;
        if (wic.mappingRules && wic.mappingRules.length > 0) {
            for (index = 0; index < wic.mappingRules.length; index++) {
                if (wic.mappingRules[index].fieldName === mappingRule.fieldName && wic.mappingRules[index].value === mappingRule.value) {
                    return callback(null, null);
                }
            }
        }
        var rule = new WorkflowMappingRule(mappingRule);
        wic.mappingRules.push(rule);
        wic.save(function (err) {
            callback(err, rule);
        });
    });
}

/**
 * Deletes a WorkflowTransformationRule.
 *
 * @param {String} workflowId the parent workflow identifier
 * @param {String} id the ID of the rule to delete
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 */
function removeWorkflowMappingRule(workflowId, id, callback) {
    var error = validator.validateObjectId('id', id);
    if (error) {
        return callback(error);
    }

    _getConfigurationByWorkflowId(workflowId, function (err, wic) {
        if (err) {
            return callback(err);
        }

        var match = wic.mappingRules.id(id);
        if (!match) {
            return callback();
        }
        match.remove();
        wic.save(delegates.noArgs(callback));
    });
}

module.exports = {
    createWorkflowIntegrationConfiguration: delegates.service(SERVICE, createWorkflowIntegrationConfiguration, {input: ["wic"], output: ["wic"]}),
    getWorkflowIntegrationConfigurations: delegates.service(SERVICE, getWorkflowIntegrationConfigurations, {input: [], output: ["wics"]}),
    removeWorkflowIntegrationConfiguration: delegates.service(SERVICE, removeWorkflowIntegrationConfiguration, {input: ["id"], output: []}),
    addWorkflowTransformationRule: delegates.service(SERVICE, addWorkflowTransformationRule, {input: ["workflowId", "transformationRule"], output: ["transformationRule"]}),
    removeWorkflowTransformationRule: delegates.service(SERVICE, removeWorkflowTransformationRule, {input: ["workflowId", "id"], output: []}),
    addWorkflowMappingRule: delegates.service(SERVICE, addWorkflowMappingRule, {input: ["workflowId", "mappingRule"], output: ["mappingRule"]}),
    removeWorkflowMappingRule: delegates.service(SERVICE, removeWorkflowMappingRule, {input: ["workflowId", "id"], output: []})
};