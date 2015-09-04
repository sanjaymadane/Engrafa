/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains constant values used in application, which shouldn't be configurable.
 *
 * @version 1.0
 * @author Sky_
 */
"use strict";


module.exports = {
    //Constants used in Review and Escalation tasks.
    COMMAND_PREFIX: "cmd__",
    COMMAND_REPLACE_TAXONOMY: "cmd__replacetaxonomy",
    COMMAND_REPLACE_CLASSIFICATION: "cmd__replaceclassification",
    COMMAND_REPLACE_EXTRACTION: "cmd__replaceextraction",
    COMMAND_USE_AS_TAXONOMY: "cmd__useastaxonomy",
    CLASSIFICATION_FIELD_PREFIX: "classification__",
    TAXONOMY_FIELD_PREFIX: "taxonomy__",
    EXTRACTION_FIELD_PREFIX: "extraction__",
    //True and false values used in CF units (cml file).
    STRING_TRUE: 'true',
    STRING_FALSE: 'false'
};