/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Helper method to perform logging
 *
 * @version 1.3
 * @author Sky_
 * changes in 1.1:
 * 1. Add logging methods for API: handleError, wrapExpress.
 *
 * changes in 1.2:
 * 1. Add createSignatureForWorkflow, createSignatureForWorkflowById.
 * 2. Fix issue when logging in createWrapper (use JSON.stringify).
 *
 * Changes in 1.3:
 * - Updated the configuration file path.
 */
"use strict";

var winston = require('winston');
var _ = require('underscore');
var util = require('util');
var async = require('async');
var config = require('../../config');

/**
 * Log error
 * @param {String} signature the signature to log
 * @param {Object} error
 */
function logError(signature, error) {
    var objToLog;
    if (error instanceof Error) {
        //stack contains error message
        objToLog = error.stack || error.toString();
    } else {
        objToLog = JSON.stringify(error);
    }
    winston.error(signature, objToLog);
}

/**
 * Log error to the console and call original callback without error.
 * It can be used for async.forEach
 * @param {String} signature the signature of calling method
 * @param {Function} callback
 * @returns {Function} the wrapped function
 */
function logAndIgnoreError(signature, callback) {
    return function (err) {
        if (err) {
            logError(signature, err);
        }
        callback();
    };
}

/**
 * Combine two arrays into object
 * @param {Array} names the arrays of names/keys
 * @param {Array} values the array of values
 * @returns {Object} the combined object
 * @private
 */
function _combineNames(names, values) {
    var index, counter = 1;
    var ret = {};
    var val;
    for (index = 0; index < names.length; index++) {
        val = values[index];
        if (val === undefined) {
            val = "<undefined>";
        }
        ret[names[index]] = val;
    }
    while (index < values.length) {
        ret["<undefined " + counter + ">"] = values[index++];
        counter++;
    }
    return ret;
}


/**
 * Create logging wrapper.
 * All required parameters must be passed to wrapped function and last parameter must be function otherwise
 * error will be thrown.
 * @param {Function} fn the function to wrap
 * @param {Object} options the options
 * @param {Array} options.input the names of input parameters
 * @param {Array} options.output the names of output parameters
 * @param {String} options.signature the signature of method
 * @returns {Function}
 */
function createWrapper(fn, options) {
    if (!_.isFunction(fn)) {
        throw new Error("fn should be a function");
    }
    if (!_.isArray(options.input)) {
        throw new Error("options.input should be an object");
    }
    if (!_.isArray(options.output)) {
        throw new Error("options.output should be an object");
    }
    if (!_.isString(options.signature)) {
        throw new Error("options.signature should be a string");
    }

    var input = options.input,
        output = options.output,
        signature = options.signature;
    return function () {
        var paramCount = input.length,
            callbackParamCount = output.length,
            callback = arguments[arguments.length - 1],
            delegatedCallback,
            start = new Date().getTime();
        if (arguments.length !== paramCount + 1) {
            throw new Error(signature + " expects at least " +
                paramCount + " parameters and a callback.");
        }
        if (!_.isFunction(callback)) {
            throw new Error("callback argument must be a function.");
        }

        var inputParams = _combineNames(input, arguments);
        winston.debug("ENTER %s %j", signature, {input: inputParams}, {});

        // replace the callback with a log and cache supporting version
        delegatedCallback = function () {
            var cbArgs = arguments;
            var wrappedError;
            //if returned error, wrap this error and log to console
            if (cbArgs[0]) {
                var error = cbArgs[0];
                winston.error("%s %j\n", signature, {input: inputParams}, error.stack || JSON.stringify(error));
                callback(error);
            } else {
                var callbackArgumentsOk = true;
                //check callback parameters existence
                if (cbArgs.length !== callbackParamCount + 1) {
                    //if callback has only callback parameters, we dont have to pass 'null' value
                    //we can call 'callback()' instead of 'callback(null)'
                    callbackArgumentsOk = cbArgs.length === 1 && callbackParamCount === 0;
                }
                if (cbArgs.length === callbackParamCount && callbackParamCount === 0) {
                    callbackArgumentsOk = true;
                }
                var outputParams = _combineNames(output, Array.prototype.slice.call(cbArgs, 1));
                if (callbackArgumentsOk) {
                    var diff = new Date().getTime() - start;
                    winston.debug("EXIT %s %j", signature, {input: inputParams, output: outputParams, time: diff + "ms"}, {});
                    callback.apply(this, cbArgs);
                } else {
                    if (callbackParamCount > cbArgs.length - 1) {
                        var missingParams = output.slice(cbArgs.length - 1);
                        wrappedError = new Error("Missing callback parameter(s): " + missingParams.join(", "));
                    } else {
                        wrappedError = new Error("Too many callback parameters");
                    }
                    winston.error("%s %j\n", signature, {input: inputParams, output: outputParams}, wrappedError.stack);
                    callback(wrappedError);
                }
            }
        };
        var args = arguments;
        args[args.length - 1] = delegatedCallback;
        try {
            fn.apply(this, args);
        } catch (e) { // catch errors within the method body
            delegatedCallback.call(this, e);
        }
    };
}

/**
 * Handle error and return it as JSON to the response.
 * @param {Error} error the error to handle
 * @param {Object} res the express response object
 * @returns {Object} the returned response
 * @since 1.1
 */
function handleError(error, res) {
    var result;
    if (error.isValidationError) {
        res.statusCode = 400;
    } else {
        res.statusCode = error.httpCode || 500;
    }
    var errorMsg = error.message || JSON.stringify(error);
    result = {
        error: errorMsg
    };
    res.json(result);
    return result;
}

/**
 * This function create a delegate for the express action.
 * Input and output logging is performed.
 * Errors are handled and proper http status code is set.
 * Wrapped method must always call the callback function, first param is error, second param is object to return
 * @param {String} signature the signature of the method caller
 * @param {Function} fn the express method to call. It must have signature (req, res, callback)
 * or (req, callback) or (callback).
 * @returns {Function} the wrapped function
 * @since 1.1
 */
function wrapExpress(signature, fn) {
    if (!_.isString(signature)) {
        throw new Error("signature should be a string");
    }
    if (!_.isFunction(fn)) {
        throw new Error("fn should be a function");
    }
    return function (req, res) {
        var paramsToLog, paramsCloned = {}, prop, clone;
        //clone properties, because wrapped method can modify them
        clone = function (obj) { return JSON.parse(JSON.stringify(obj)); };
        //req.params is custom object and must be cloned only in this way
        for (prop in req.params) {
            if (req.params.hasOwnProperty(prop)) {
                paramsCloned[prop] = req.params[prop];
            }
        }
        paramsToLog =  {
            body: clone(req.body),
            params: paramsCloned,
            query : clone(req.query),
            url: req.url
        };
        winston.info("ENTER %s %j", signature, paramsToLog, {});
        async.waterfall([
            function (cb) {
                try {
                    if (fn.length === 3) {
                        fn(req, res, cb);
                    } else if (fn.length === 2) {
                        fn(req, cb);
                    } else {
                        fn(cb);
                    }
                } catch (e) {
                    cb(e);
                }
            }, function (result) {
                paramsToLog.response = result;
                winston.info("EXIT %s %j", signature, paramsToLog, {});
                res.json(result);
            }
        ], function (error) {
            var response = handleError(error, res);
            paramsToLog.response = response;
            winston.error("EXIT %s %j\n", signature, paramsToLog, error.stack);
        });
    };
}

/**
 * Create signature used for logging for given client and workflow.
 * @param {Client} client the client
 * @param {Workflow} workflow the workflow
 * @param {Boolean} [prefix] the flag whether signature will be used as prefix, if true " - " will be appended
 * @returns {String} the signature
 * @since 1.2
 */
function createSignatureForWorkflow(client, workflow, prefix) {
    var ret = util.format("{%s | %s}", client.name, workflow.name);
    if (prefix) {
        return ret + " - ";
    }
    return ret;
}

/**
 * Create signature used for logging for given client and workflowId.
 * @param {Client} client the client
 * @param {String} workflowId the workflowId. The client.workflows will be search to retrieve the workflow
 * @param {Boolean} [prefix] the flag whether signature will be used as prefix, if true " - " will be appended
 * @returns {String} the signature
 * @since 1.2
 */
function createSignatureForWorkflowById(client, workflowId, prefix) {
    var workflow = _.find(client.workflows, function (item) {
        return String(item.id) === String(workflowId);
    });
    return createSignatureForWorkflow(client, workflow, prefix);
}

module.exports = {
    logError: logError,
    logAndIgnoreError: logAndIgnoreError,
    createWrapper: createWrapper,
    wrapExpress: wrapExpress,
    handleError: handleError,
    createSignatureForWorkflow: createSignatureForWorkflow,
    createSignatureForWorkflowById: createSignatureForWorkflowById
};