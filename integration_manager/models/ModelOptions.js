/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents the common options attached to models.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";
module.exports = {

    /**
     * This ensures that the returned JSON to clients do not have MongoDB specific attributes.
     */
    toJSON : {
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
};