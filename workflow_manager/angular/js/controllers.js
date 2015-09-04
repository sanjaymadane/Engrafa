/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

'use strict';

/**
 * Represents controllers for angular
 *
 * @author Sky_
 * @version 1.1
 *
 * changes in 1.1:
 * 1. Add support for multiple clients.
 * 2. In Settings show client and workflow lists to choose from.
 */
/*global angular, _, $, DOMParser */

/**
 * Params for ng table. Must provide only any values.
 */
var TABLE_PARAMS = {
    page: 0,
    count: 0
};

angular.module('engrafa.controllers', []).

    /**
     * Home controller route /
     */
    controller('HomeCtrl', ['$scope', function ($scope) {
        $scope.header = "MetaTasker - Workflow Manager";
    }]).
    controller('DataCtrl', ['$scope', 'API', 'toaster',
        function ($scope, API, toaster) {
            var sampleQuery = {
                processingPhase: {$ne: "CLASSIFICATION"},
                isDone: true,
                "evaluationContext.state": "IL",
                "evaluationContext.validstate": "Yes"
            };
            $scope.query = JSON.stringify(sampleQuery, null, 4);
            $scope.editorOptions = {
                mode: {
                    name: "javascript",
                    json: true
                },
                lineWrapping : true,
                styleActiveLine: true
            };
            //search for documents
            $scope.search = function () {
                $scope.selectedItem = null;
                var query;
                try {
                    query = JSON.parse($scope.query);
                } catch (e) {
                    toaster.pop('error', 'Invalid query', "Query is not valid JSON.");
                    return;
                }
                $scope.disableSearch = true;
                API.searchDocuments(query, function (data) {
                    $scope.disableSearch = false;
                    if (!data.length) {
                        toaster.pop('error', 'No results', "Search query returned 0 results.");
                    }
                    $scope.items = data;
                }).error(function () {
                    $scope.disableSearch = false;
                });
            };
            //show details of selected item
            $scope.showDetails = function (item) {
                item.contextKeys = _.keys(item.evaluationContext);
                item.editing = {};
                item.orgValues = {};
                item.editingXML = false;
                item.xmlChanged = false;
                item.contextChanged = false;
                $scope.selectedItem = item;
                //used when edited and clicked Back button
                $scope.selectedItemBak = JSON.parse(JSON.stringify(item));
            };

            //start editing evaluation context property
            $scope.editProp = function (key) {
                $scope.selectedItem.orgValues[key] = $scope.selectedItem.evaluationContext[key];
                $scope.selectedItem.editing[key] = true;
            };

            //confirm editing evaluation context property
            $scope.confirmEditProp = function (key) {
                var value = $scope.selectedItem.evaluationContext[key],
                    number = Number(value);
                //try to convert to number if numeric value
                if (String(value).trim().length && !isNaN(number)) {
                    $scope.selectedItem.evaluationContext[key] = number;
                }
                $scope.selectedItem.editing[key] = false;
                $scope.selectedItem.contextChanged = true;
            };

            //revert editing evaluation context property
            $scope.revertEditProp = function (key) {
                $scope.selectedItem.evaluationContext[key] = $scope.selectedItem.orgValues[key];
                $scope.selectedItem.editing[key] = false;
            };

            //start editing xml
            $scope.editXml = function () {
                if ($scope.selectedItem.editingXML) {
                    return;
                }
                $scope.selectedItem.resultXMLbak = $scope.selectedItem.resultXML;
                $scope.selectedItem.editingXML = true;
            };

            //revert editing xml
            $scope.revertEditXml = function () {
                $scope.selectedItem.resultXML = $scope.selectedItem.resultXMLbak;
                $scope.selectedItem.editingXML = false;
            };

            //apply editing xml
            $scope.applyEditXml = function () {
                var parser = new DOMParser(),
                    result = parser.parseFromString($scope.selectedItem.resultXML, "text/xml");
                if (result.getElementsByTagName("parsererror").length) {
                    toaster.pop('error', 'Invalid xml', "Result is not valid XML.");
                    return;
                }
                $scope.selectedItem.editingXML = false;
                $scope.selectedItem.xmlChanged = true;
            };

            $scope.xmlEditorOptions = {
                mode: "xml",
                lineWrapping : true,
                lineNumbers: true,
                styleActiveLine: true,
                matchBrackets: true
            };

            //exit details view and show list again
            $scope.back = function () {
                //revert all properties
                _.extend($scope.selectedItem, $scope.selectedItemBak);
                $scope.selectedItem = null;
            };
            //submit changes to API
            $scope.saveChanges = function () {
                var activeContextEdits = _.chain($scope.selectedItem.editing).values().compact().value();
                if ($scope.selectedItem.editingXML || activeContextEdits.length) {
                    toaster.pop('warning', 'Pending Changes', "Please accept or reject current edits.");
                    return;
                }
                var data = { };
                if ($scope.selectedItem.xmlChanged) {
                    data.xml = $scope.selectedItem.resultXML;
                }
                if ($scope.selectedItem.contextChanged) {
                    data.context = $scope.selectedItem.evaluationContext;
                }
                $scope.blockSave = true;
                API.saveDocument($scope.selectedItem._id, data, function () {
                    toaster.pop('success', 'Document', "Changes have been saved.");
                    $scope.selectedItem.xmlChanged = false;
                    $scope.selectedItem.contextChanged = false;
                    $scope.blockSave = false;
                    //update back, because changes are approved
                    $scope.selectedItemBak = JSON.parse(JSON.stringify($scope.selectedItem));
                }).error(function () {
                    $scope.blockSave = false;
                });
            };
        }]).
    /**
     * Settings controller route /settings
     */
    controller('SettingsCtrl', ["$scope", "API", 'toaster',
        function ($scope, API, toaster) {
            //interval id for checking status
            var intervalId, updateStatus, clearStatusInterval;
            $scope.refreshEditor = 0;

            //clear interval if exists
            clearStatusInterval = function () {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            };

            //update status in intervals if current status is 'stopping'
            updateStatus = function () {
                clearStatusInterval();
                if ($scope.status !== "stopping") {
                    return;
                }
                intervalId = setInterval(function () {
                    API.getStatus(function (data) {
                        $scope.status = data.status;
                        if (data.status !== "stopping") {
                            clearStatusInterval();
                        }
                    });
                }, 1000);
            };
            //choose a client from the list
            $scope.selectClient = function (client) {
                $scope.selectedClient = client;
            };
            //choose a workflow from the list
            $scope.selectWorkflow = function (workflow) {
                $scope.selectedWorkflow = workflow;
                var copy = JSON.parse(JSON.stringify(workflow));
                var removeProps = function (obj) {
                    delete obj._id;
                    delete obj.id;
                    delete obj.$$hashKey;
                };
                removeProps(copy);
                _.each(copy.taskGroups, function (taskGroup) {
                    removeProps(taskGroup);
                    _.each(taskGroup.tasks, removeProps);
                });
                // workaround for issue when content is not visible
                setTimeout(function () {
                    $scope.refreshEditor++;
                    $scope.workflow = JSON.stringify(copy, null, 4);
                    $scope.$apply();
                });
            };
            // show list of clients "back" button
            $scope.showClients = function () {
                $scope.selectedClient = null;
            };
            // show list of workflows "back" button
            $scope.showWorkflows = function () {
                $scope.selectedWorkflow = null;
                $scope.workflow = null;
            };
            //validate workflow
            $scope.validate = function () {
                var data;
                try {
                    data = JSON.parse($scope.workflow);
                } catch (e) {
                    toaster.pop('error', 'Invalid Workflow', "Workflow is not valid JSON.");
                    return;
                }
                API.validate(data, function (response) {
                    if (response.ok) {
                        toaster.pop('success', 'Valid Workflow', "Workflow is valid.");
                    } else {
                        toaster.pop('error', 'Invalid Workflow', response.error);
                    }
                });
            };
            //save workflow
            $scope.save = function () {
                var data;
                try {
                    data = JSON.parse($scope.workflow);
                } catch (e) {
                    toaster.pop('error', 'Invalid Workflow', "Workflow is not valid JSON.");
                    return;
                }
                var wf = $scope.selectedWorkflow;
                API.saveWorkflow($scope.selectedClient.id, $scope.selectedWorkflow.id, data, function (response) {
                    wf.name = data.name;
                    wf.input = data.input;
                    wf.output = data.output;
                    wf.taskGroups = data.taskGroups;
                    if (response.ok) {
                        toaster.pop('success', 'Workflow', "Changes have been saved.");
                    } else {
                        toaster.pop('error', 'Invalid Workflow', response.error);
                    }
                });
            };
            $scope.showSpinner();
            $scope.status = "unknown";
            $scope.disableStartStop = true;

            API.getSettings(function (data) {
                $scope.hideSpinner();
                $scope.balance = data.balance;
                $scope.log = data.log;
                $scope.logSize = _.compact(data.log.split("\n")).length;
               // $scope.workflow = JSON.stringify(data.taskGroups, null, 4);
                $scope.clients = data.clients;
                $scope.disableStartStop = false;
            });

            API.getStatus(function (data) {
                $scope.status = data.status;
            });

            //start background service
            $scope.startService = function () {
                $scope.disableStartStop = true;
                clearStatusInterval();
                API.startService(function (data) {
                    $scope.status = data.status;
                    $scope.disableStartStop = false;
                }).error(function () {
                    $scope.disableStartStop = false;
                });
            };

            //stop background service
            $scope.stopService = function () {
                $scope.disableStartStop = true;
                clearStatusInterval();
                API.stopService(function (data) {
                    $scope.status = data.status;
                    $scope.disableStartStop = false;
                    updateStatus();
                }).error(function () {
                    $scope.disableStartStop = false;
                });
            };

            $scope.editorOptions = {
                mode: {
                    name: "javascript",
                    json: true
                },
                lineWrapping : true,
                lineNumbers: true,
                styleActiveLine: true,
                matchBrackets: true
            };
        }]).
    /**
     * Jobs controller route /jobs
     */
    controller('JobsCtrl', ["$scope", "$filter", "API", "ngTableParams",
        function ($scope, $filter, API, ngTableParams) {
            $scope.showSpinner();
            API.getInternalJobs(function (data) {
                $scope.jobs = data;
                $scope.tableParams = new ngTableParams(TABLE_PARAMS, {
                    getData: function ($defer, params) {
                        var orderedData = params.sorting() ?
                                    $filter('orderBy')($scope.jobs, params.orderBy()) : $scope.jobs;
                        $defer.resolve(orderedData);
                    }
                });
                $scope.hideSpinner();
            });
        }]).
    /**
     * Reports controller route /reports
     */
    controller('ReportsCtrl', ["$scope", "API", "ngTableParams",
        function ($scope, API, ngTableParams) {

            $scope.showSpinner();
            API.getReports(function (data) {
                $scope.jobs = data;
                $scope.workUnitsParams = new ngTableParams(TABLE_PARAMS, {
                    getData: function ($defer) {
                        $defer.resolve(data.workUnitsSummary);
                    }
                });
                $scope.jobsParams = new ngTableParams(TABLE_PARAMS, {
                    getData: function ($defer) {
                        $defer.resolve(data.jobsData);
                    }
                });
                $scope.hideSpinner();
            });
            $scope.visible = {};
            //check if expand record for given phase
            $scope.isVisible = function (phase) {
                return $scope.visible[phase];
            };

            //toggle expand
            $scope.toggle = function (phase) {
                $scope.visible[phase] = !$scope.visible[phase];
            };
        }]);
