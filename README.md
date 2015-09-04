cr-engrafa
==========

The goal of the Engrafa Project is to help clients generate structured data from documents, with industry-leading accuracy.  By leveraging third-party platforms and crowdsourcing, we can extract useful information from documents in an automated fashion.  Additionally, the service helps provide the structured data based on the needs of various clients.

The application is broken into 4 main modules:

 - Document Manager
 - Workflow Manager
 - Integration Manager
 - Middleware Service

## Setup
1. Install the dependencies:

  ```
  npm install

2. Configure the box.com and CrownFlower setting.

3. Start / stop instances by following command:
    To start all instances,
    cd maintenance
    npm run startInstances

    To stop all instances, in maintenance directory, run following command:
    npm run stopInstances

    To only start the workflow manager module, in maintenance directory, run following command:
    npm run startWorkflow

    To only start the integration manager module, in maintenance directory, run following command:
    npm run startIntegration

    To only stop the workflow manager module, in maintenance directory, run following command:
    npm run stopWorkflow

    To only stop the integration manager module, in maintenance directory, run following command:
    npm run stopIntegration

    To remove all generated access token files, in maintenance directory, run following command:
    npm run removeTokens

## Document Manager
Document Manager helps clients manage their documents for easy use with the rest of the Engrafa Service and external systems.  Document Manager processes documents for optimization/compression, and provides an easy HTML5 document view.

## Workflow Manager
Workflow Manager acts as a traffic cop to automate sending PDFs through segmented jobs and aggregating the results into a complete data set.  Workflow Manager monitors client files in online storage and spins up crowdsourcing work units to capture metadata and data within the documents.

## Integration Manager
Integration Manager allows external systems to readily consume and manipulate the data extracted from the Workflow Manager.  Data is shared and manipulated through webhooks and APIs.

## Middleware Service
The Middleware Service is a custom integration piece that further translates Integration Manager results for a specific external system.

