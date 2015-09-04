/**
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * This service provides methods to call webhooks.
 *
 * @version 1.2
 * @author albertwang, j3_guile, Sky_
 *
 * changes in 1.1:
 * 1. Send notification as json object, not as string.
 *
 * Changes in 1.2:
 * - Updated the configuration file path.
 */
"use strict";
var SERVICE = 'WebhookService';

// sets behavior for hook notification error reporting, if true, then notification errors are not propagated to callers
var SUPPRESS_HOOK_ERROR = false;

var _ = require('underscore');
var crypto = require('crypto');
var request = require('superagent');
var async = require('async');

var config = require('../../config');
var mongoose = config.getIntegrationManagerMongoose();
var ClientAPIConfiguration = mongoose.model('ClientAPIConfiguration',
    require('../models/ClientAPIConfiguration').ClientAPIConfigurationSchema);
var WebhookTypeEnum = require('../models/WebhookType');

var validator = require("../helpers/validator");
var delegates = require("../helpers/DelegateFactory");

/**
 * Validates the given arguments for webhook notification.
 *
 * @param {String} clientId the client ID
 * @param {String} webhookType the webhook type
 * @param {Object} notification the payload
 * @returns {ValidationError} if any of the given arguments are invalid
 * @private
 */
function _validateNotifyWebhookArguments(clientId, webhookType, notification) {
    var error = validator.validateString('clientId', clientId);
    if (!error) {
        error = validator.validateString('webhookType', webhookType);
    }
    if (!error) {
        if (WebhookTypeEnum.indexOf(webhookType) === -1) {
            error = validator.createError('webhookType', 'Unknown webhook type.', webhookType);
        }
    }
    if (!error) {
        error = validator.validateObject('notification', notification);
    }
    return error;
}

/**
 * Send notification to a webhook.
 *
 * @param {String} clientId the client ID
 * @param {String} webhookType the webhook type
 * @param {Object} notification the notification object
 * @param {Function} callback the callback function it is given the following parameters
 *    1) error - execution errors encountered (if any)
 *    2) response - result of POST request to the matching webhook type
 */
function notifyWebhook(clientId, webhookType, notification, callback) {
    var error = _validateNotifyWebhookArguments(clientId, webhookType, notification);
    if (error) {
        return callback(error);
    }

    async.waterfall([
        // Get ClientAPIConfiguration
        function (cb) {
            ClientAPIConfiguration.findOne({ clientId: clientId }, cb);
        },

        // Send webhook notification
        function (cac, cb) {
            if (!cac) {
                return cb({status: 404, message: 'ClientAPIConfiguration not found for ' + clientId});
            }

            // Get the webhook, we only care about the first match
            var webhook = _.find(cac.webhooks, function (wh) {
                return wh.type === webhookType;
            });

            // no matching webhooks for the specified type, just ignore this event
            if (!webhook) {
                return cb(null, 'No hooks are available.');
            }

            // Prepare content
            var content = JSON.stringify(notification);

            // Compute signature using HMAC-SHA256
            var signature = crypto.createHmac('SHA256', cac.authenticationKey).update(content).digest('base64');
            try {
                // Post to webhook
                request.post(webhook.url)
                    .set('X-Engrafa-Signature', signature)
                    .send(notification)
                    .end(function (err, res) {
                        if (err) {
                            delegates.getLog().error('Failed to send notification', err);

                            // lets leave this to a flag, since this is a 3rd party call which can fail regularly
                            if (!SUPPRESS_HOOK_ERROR) {
                                return cb({status: 500, message: 'Failed to send notification'});
                            }
                        }

                        if (!res) {
                            return cb(null, 'No Response from server.');
                        }

                        if (res.error) {
                            delegates.getLog().error('Notification hook returned an error.', res.error);
                        } else {
                            delegates.getLog().info('Notification hook response.', res.text);
                        }
                        cb(null, res.error || res.text || '');
                    });
            } catch (e) {
                cb(e);
            }
        }
    ], callback);
}

module.exports = {
    notifyWebhook: delegates.service(SERVICE, notifyWebhook, {input: ["clientId", "webhookType", "notification"], output: ["response"]})
};
