/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * This module contains the application configurations.
 *
 * @version 1.0
 * @author albertwang, arvind81983
 */
"use strict";

module.exports = {
    // This represents the directory used to temporarily hold document processing input and output files.
    DOCUMENT_PROCESSING_DIRECTORY : './processing',

    // This represents the port used to serve HTTP server.
    SERVER_PORT : 8080,

    // This represents the CVISION Trapeze license usage log file.
    CVISION_TRAPEZE_LICENSE_USAGE_LOG : 'C:/ProgramData/CVision/Trapeze/logs/licUsage.log',

    // This represents the command used to run CVISION Trapeze,
    // including command line options except for "-in" and "-out".
    CVISION_TRAPEZE_COMMAND : '"C:/Program Files (x86)/CVision/Trapeze 1.2/CVTrapeze.exe"  ' +
        '-m 1 -c ON -acroversion 0 -colorcomptype 2 -mrcquality 7 -mrcColorCompType 0 -mrcresample 1 ' +
        '-mrcSegType 2 -mrcPRed 2 -mrcPDCTQuality 40 -linearize -o -oocr -ocrmode accurate -okeepname ' +
        '-qualityc 75 -qualityg 75 -rscdwndpi 300 -rscinterp smartbicubic -rsgdwndpi 300 -rsginterp ' +
        'smartbicubic -rsbdwndpi 300 -rsbinterp smartbicubic -cconc -ccong -config ' +
        '"C:/ProgramData/CVision/PdfCompressor/batch/batch_20140930171708.DocAttrib.xml" -redirstderr'
};
