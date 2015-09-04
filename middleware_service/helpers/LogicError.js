/**
 * New class to identify business logic or custom  error  in MiddleWare Service.
 * @author arpit
 */


"use strict";

var util = require('util');

function LogicError(message) {
    /*INHERITANCE*/
    Error.apply(this, arguments); //super constructor
    Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

    this.name = this.constructor.name;
    this.message = message;
}

// inherit from Error
util.inherits(LogicError, Error);

//Export the constructor function as the export of this module file.
exports = module.exports = LogicError;
