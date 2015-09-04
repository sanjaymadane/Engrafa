/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Contains validation functions specific to the IM module.
 *
 * @version 1.1
 * @author j3_guile
 *
 * Changes in 1.1:
 * - Updated the configuration file path.
 */
"use strict";

var _ = require('underscore');
var ValidationError = require('../../node_modules/mongoose/lib/error/validation');
var ValidatorError = require('../../node_modules/mongoose/lib/error/validator');

/**
 * Creates an error.
 * @param path the variable path
 * @param message the error message
 * @param value the value resolved
 * @returns {ValidationError} the created error
 */
function createError(path, message, value) {
    var error = new ValidationError({});
    error.errors[path] = new ValidatorError(path, message, 'String', value);
    return error;
}

/**
 * Validates a required string.
 *
 * @param {String} path the name of the argument
 * @param {String} str the value to validate
 * @returns {ValidationError} error if validation failed or null if validation passed.
 */
function validateString(path, str) {
    if (!_.isString(str)) {
        return createError(path, path + ' is required.', str);
    }
    if (str === "") {
        return createError(path, path + ' is required.', str);
    }
    return null;
}

/**
 * Validates an object id string.
 *
 * @param {String} str the value to validate
 * @returns {boolean} true if the string is a valid 24character hex string
 */
function isValidObjectId(str) {
    var error = validateString('objectId', str);
    if (error) {
        return false;
    }
    return new RegExp("^[0-9a-fA-F]{24}$").test(str);
}

/**
 * Validates a required string that represents an objectId.
 *
 * @param {String} path the name of the argument
 * @param {String} str the value to validate
 * @returns {ValidationError} error if validation failed or null if validation passed.
 */
function validateObjectId(path, str) {
    if (!isValidObjectId(str)) {
        return createError(path, path + ' is required.', str);
    }
    return null;
}

/**
 * Validates a required object.
 *
 * @param {String} path the name of the argument
 * @param {Object} obj the value to validate
 * @returns {ValidationError} error if validation failed or null if validation passed.
 */
function validateObject(path, obj) {
    if (!obj) {
        return createError(path, path + ' is required.', '');
    }
    if (!_.isObject(obj)) {
        return createError(path, path + ' must be an object.', '');
    }
    return null;
}

/**
 * Validates a required object to have a specific mongoose type.
 *
 * @param {String} path the name of the argument
 * @param {Object} obj the value to validate
 * @param {String} type the type of object expected
 * @returns {ValidationError} error if validation failed or null if validation passed.
 */
function validateType(path, obj, type) {
    var error = validateObject(path, obj);
    if (error) {
        return error;
    }
    if (obj.constructor.modelName !== type) {
        return createError(path, 'Path `' + path + '` must an instance of ' + type, '');
    }
    return null;
}

module.exports = {
    validateString: validateString,
    isValidObjectId: isValidObjectId,
    validateObjectId: validateObjectId,
    validateObject: validateObject,
    validateType: validateType,
    createError: createError
};