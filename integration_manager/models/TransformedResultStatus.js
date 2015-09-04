/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents transformed result status.
 *
 * @version 1.0
 * @author albertwang, j3_guile
 */
"use strict";

// Enumerated values for transformed result status.
module.exports = [
    // Represents pending results.
    "pending",
    // Represents ready for import.
    "ready_for_import",
    // Represents import succeeded.
    "import_succeeded",
    // Represents import failed.
    "import_failed",
     // Represents rejected results.
    "rejected"
];