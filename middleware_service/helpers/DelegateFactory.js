/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Utility methods for generating function delegates.
 *
 * Copied from integration_manager/helpers/DelegateFactory.js
 *
 * @version 1.1
 * @author j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";

var _ = require('underscore');
var winston = require('winston');
var async = require('async');
var config = require('../../config');

// send output to log file
winston.add(winston.transports.File, { filename: 'logs/debug.log', level: 'debug', json: false, maxsize: config.LOG_MAX_FILE_SIZE });

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
 * Creates a service method delegate.
 *
 * All required parameters must be passed to wrapped function and last parameter must be function otherwise
 * error will be thrown.
 * @param {String} signature the signature of the method caller
 * @param {Function} fn the function to wrap
 * @param {Object} options the options
 * @param {Array} options.input the names of input parameters
 * @param {Array} options.output the names of output parameters
 * @returns {Function} the delegate function
 * @throws Error if fn is not a function, the options do not contain the proper arrays or the function does not
 *  properly define a callback function as the last argument
 */
function serviceMethod(signature, fn, options) {
    if (!_.isFunction(fn)) {
        throw new Error("fn should be a function");
    }
    if (!_.isArray(options.input)) {
        throw new Error("options.input should be an Array");
    }
    if (!_.isArray(options.output)) {
        throw new Error("options.output should be an Array");
    }

    var input = options.input,
        output = options.output;

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
        winston.info("ENTER %s %j", signature, {input: inputParams}, {});

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
                    winston.info("EXIT %s %j", signature, {input: inputParams, output: outputParams, time: diff + "ms"}, {});
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
 * This function create a delegate for the express action.
 * Input and output logging is performed.
 * Wrapped method must always call the callback function, first param is error, second param is object to return
 * @param {String} signature the signature of the method caller
 * @param {Function} fn the express method to call. It must have signature (req, res, callback)
 * @param {Boolean} handlesCommit if true, the controller handles rendering, so just log the output
 * or (req, callback) or (callback).
 * @returns {Function} the wrapped function
 * @throws Error if fn is not a function or the signature is not a string
 */
function controllerMethod(signature, fn, handlesCommit) {
    if (!_.isString(signature)) {
        throw new Error("signature should be a string");
    }
    if (!_.isFunction(fn)) {
        throw new Error("fn should be a function");
    }
    return function (req, res, next) {
        var paramsToLog, paramsCloned = {}, prop, clone;
        //clone properties, because wrapped method can modify them
        clone = function (obj) {
            return JSON.parse(JSON.stringify(obj));
        };
        //req.params is custom object and must be cloned only in this way
        for (prop in req.params) {
            if (req.params.hasOwnProperty(prop)) {
                paramsCloned[prop] = req.params[prop];
            }
        }
        paramsToLog = {
            body: clone(req.body),
            params: paramsCloned,
            query: clone(req.query),
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
                if (!handlesCommit) {
                    res.json(result);
                }
            }
        ], function (error) {
            if (error.name === 'Error') {
                var json = {
                    message: error.message
                };
                paramsToLog.response = JSON.stringify(json);
                winston.error("EXIT %s \n %j", signature, paramsToLog, error.stack);
                if (!handlesCommit) {
                    next(error);
                }
            } else {
                paramsToLog.response = JSON.stringify(error);
                winston.error("EXIT %s \n %j", signature, paramsToLog, error.stack);
                if (!handlesCommit) {
                    next(error);
                }
            }
        });
    };
}

module.exports = {

    /**
     * Creates a callback delegate that suppresses the additional arguments of the original callback.
     * @param {Function} next the callback to wrap
     * @returns {Function} a function to take the place of the given callback
     */
    noArgs: function (next) {
        return this.spliceArgs(next, 0);
    },

    /**
     * Creates a callback delegate that suppresses the additional arguments of the original callback.
     * @param {Function} next the callback to wrap
     * @param {Number} count the number of arguments to splice
     * @returns {Function} a function to take the place of the given callback
     */
    spliceArgs: function (next, count) {
        return function () {
            if (arguments.length === 0) {
                return next(null);
            }
            var args = [], i;
            for (i = 0; i < count + 1; i++) {
                args.push(arguments[i]);
            }

            next.apply({}, args);
        };
    },

    /**
     * Creates a delegate that wraps an expressJS function for logging.
     * @param {String} name the name of the controller
     * @param {Function} next the expressJS request handler
     * @param {Boolean} handlesCommit if true, the controller handles rendering, so just log the output
     * @returns {Function} the function to take the place of the given handler
     */
    controller: function (name, next, handlesCommit) {
        return controllerMethod(name + '#' + next.name, next, handlesCommit);
    },

    /**
     * Creates a delegate that wraps an expressJS function for logging.
     * @param {String} name the name of the service
     * @param {Function} next the service method
     * @param {Object} options the options
     * @returns {Function} the function to take the place of the given handler
     * @throws Error if fn is not a function, the options do not contain the proper arrays or the function does not
     *  properly define a callback function as the last argument
     */
    service: function (name, next, options) {
        return serviceMethod(name + '#' + next.name, next, options);
    },

    /**
     * Returns the logging implementation.
     * @returns {*|exports} the logging delegate
     */
    getLog: function () {
        return winston;
    },

    /**
     * Deletes attributes 'id' and '_id' from the given object.
     * @param {Object} the object to remove the ID fields from
     * @returns {*} the same object, without the mongoose identifiers
     */
    noIds: function (obj) {
        if (obj) {
            delete obj.id;
            delete obj._id;
        }
        return obj;
    }
};