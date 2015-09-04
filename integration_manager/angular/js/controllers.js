/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */
'use strict';

/**
 * Represents controllers for angular
 *
 * v1.1 sgodwin424 - Added report capabilities.
 *
 * Changes in 1.2:
 * 1. change results page - move pagination, filtering and sorting to backend
 *
 * @author Katat, Shankar Kamble, sgodwin424
 * @version 1.2
 *
 */
/*global angular, _, $, window */

var removeElement = function (collection, value, attr) {
    var toRemove, index = 0;
    collection.forEach(function (conf) {
        if (value === conf[attr]) {
            toRemove = index;
            return;
        }
        index++;
    });
    collection.splice(toRemove, 1);
};
/**
 * controllers
 */
angular.module('engrafa.controllers', [])
    .controller('HeaderCtrl', ['$scope', '$location', '$window', 'Auth', function ($scope, $location, $window, Auth) {
        Auth.$on('admin login', function () {
            $scope.isAdmin = true;
            $scope.isLogin = true;
        });
        Auth.$on('user login', function () {
            $scope.isUser = true;
            $scope.isLogin = true;
        });
        Auth.$on('user logout', function () {
            $scope.isAdmin = false;
            $scope.isLogin = false;
        });

        $scope.openResultListLink = function (status) {

            $location.path('/results').search('resultStatus', status).search('page', 1);

            //Refresh the screen
            $window.location.reload();
        };
    }])
    .controller('LoginCtrl', ['$scope', 'Session', '$location', 'Auth', 'toaster', function ($scope, Session, $location, Auth, toaster) {
        var resetPassword = $location.search().passwordReset;

        Auth.$on('admin login', function () {
            $location.path('/users');
        });
        Auth.$on('user login', function () {
            //Make sure to remove any stray query params
            $location.path('/results').search('resultStatus', 'import_failed');
        });
        $scope.login = function (username, password) {
            Auth.login(username, password);
        };

        if (resetPassword) {
            toaster.pop('success', 'Password Reset', 'Your password has been reset successfully. Kindly login again with your new password');

            //Remove query param
            $location.search('passwordReset', null);
        }
    }])
    .controller('UserManagementCtrl', ['$scope', 'API', '$location', function ($scope, API, $location) {
        $scope.getUserList = function (callback) {
            API.getUserList(function (users) {
                $scope.users = users;
                if (callback) {
                    return callback(users);
                }
            });
        };
        $scope.addUser = function (username, password) {
            API.addUser({
                username: $('#username').val(),
                clientId: $('#password').val(),
                password: password
            }, function (data) {
                $scope.users.push(data);
                $location.path('/users');
            });
        };
        $scope.updateUser = function (user) {
            API.updateUser({
                id: user.id,
                username: user.username,
                clientId: user.clientId,
                isAdmin: user.isAdmin
            });
        };
        $scope.deleteUser = function (user) {
            if (window.confirm('Are you sure to delete this user?')) {
                API.deleteUser(user.id, function () {
                    removeElement($scope.users, user.id, 'id');
                    $location.path('/users');
                });
            }
        };
        $scope.updatePassword = function (user) {
            if (user.password) {
                API.updatePassword({
                    id: user.id,
                    password: user.password
                });
            }
        };
        $scope.getUserList();
    }])
    .controller('ClientConfigManagementCtrl', ['$scope', 'API', '$location', function ($scope, API, $location) {
        $scope.getConfigList = function (callback) {
            API.getClientConfigs(function (configs) {
                $scope.configs = configs;
                if (callback) {
                    return callback(configs);
                }
            });
        };
        $scope.addConfig = function (config) {
            API.addClientConfig(config, function (data) {
                $scope.configs.push(data);
                $location.path('/clientconfigs');
            });
        };
        $scope.removeWebHook = function (index) {
            this.currentConfig.webhooks.splice(index, 1);
        };
        $scope.addWebHook = function (config) {
            config.webhooks = config.webhooks || [];
            config.webhooks.push({});
        };
        $scope.updateConfig = function (config) {
            API.updateClientConfig(config);
        };
        $scope.deleteConfig = function (config) {
            if (window.confirm('Are you sure to delete this client configuration?')) {
                API.deleteClientConfig(config.id, function () {
                    var toRemove, index = 0;
                    $scope.configs.forEach(function (conf) {
                        if (config.id === conf.id) {
                            toRemove = index;
                            return;
                        }
                        index++;
                    });
                    $scope.configs.splice(toRemove, 1);
                    $location.path('/clientconfigs');
                });
            }
        };
        $scope.getConfigList();
    }])
    .controller('WorkflowConfigManagementCtrl', ['$scope', 'API', '$location', function ($scope, API, $location) {
        $scope.getConfigList = function (callback) {
            API.getWorkflowConfigs(function (configs) {
                $scope.configs = configs;
                if (callback) {
                    return callback(configs);
                }
            });
        };
        $scope.addWorkflowIntegrationConfig = function (config) {
            var self = this;
            API.addWorkflowIntegrationConfig(config, function (data) {
                $scope.configs.push(data);
                self.currentConfig = data;
            });
        };
        $scope.deleteWorkflowIntegrationConfig = function (config) {
            if (window.confirm('Are you sure to delete this workflow configuration?')) {
                API.deleteWorkflowIntegrationConfig(config.id, function () {
                    removeElement($scope.configs, config.id, 'id');
                    $location.path('/workflowconfigs');
                });
            }
        };
        $scope.addMappingRule = function (config) {
            config.mappingRules = config.mappingRules || [];
            config.mappingRules.push({});
        };
        $scope.saveMappingRule = function (index) {
            var self = this;
            API.addMappingRule(this.currentConfig.workflowId, self.currentConfig.mappingRules[index], function (data) {
                self.currentConfig.mappingRules[index] = data;
            });
        };
        $scope.removeMappingRule = function (rule) {
            var self = this;
            if (rule.id) {
                if (window.confirm('Are you sure to delete this rule?')) {
                    API.deleteMappingRule(this.currentConfig.workflowId, rule.id, function () {
                        removeElement(self.currentConfig.mappingRules, rule.id, 'id');
                    });
                }
            } else {
                removeElement(self.currentConfig.mappingRules, rule.$$hashKey, '$$hashKey');
            }
        };

        $scope.addTransformationRule = function (config) {
            config.transformationRules = config.transformationRules || [];
            config.transformationRules.push({});
        };
        $scope.saveTransformationRule = function (index) {
            var self = this;
            API.addTransformationRule(this.currentConfig.workflowId, self.currentConfig.transformationRules[index], function (data) {
                self.currentConfig.transformationRules[index] = data;
            });
        };
        $scope.removeTransformationRule = function (rule) {
            var self = this;
            if (rule.id) {
                if (window.confirm('Are you sure to delete this rule?')) {
                    API.deleteTransformationRule(this.currentConfig.workflowId, rule.id, function () {
                        removeElement(self.currentConfig.transformationRules, rule.id, 'id');
                    });
                }
            } else {
                removeElement(self.currentConfig.transformationRules, rule.$$hashKey, '$$hashKey');
            }
        };
        $scope.validateObjectId = function (objId) {
            if (!objId) {
                return false;
            }
            var objIdRegex = /^[a-z0-9]{24}$/;
            if (objIdRegex.test(objId)) {
                return true;
            }
            return false;
        };
        $scope.getConfigList();
    }])
    .filter('ellipsis', function () {
        return function (input, maxCharacters) {
            if (input.length <= maxCharacters) {
                return input;
            }
            return input.substring(0, maxCharacters) + "...";
        };
    })
    .controller('TransformedResultCtrl', ['$scope', 'API', '$stateParams', '$location', "$filter", "$window", "$sce", "toaster", "$timeout", function ($scope, API, $stateParams, $location, $filter, $window, $sce, toaster, $timeout) {
        var pageSize = 25;
        $scope.data = [];
        $scope.page = {
            value: $location.search().page || 1
        };

        // Get index of specific field in array
        function getIndexOf(arr, val, prop) {
            var k;
            for (k = 0; k < arr.length; k = k + 1) {
                if (arr[k][prop] === val) {
                    return k;
                }
            }
            return -1;
        }

        var createData = function (transformedResults) {
            var data = [], i, j, k, docday, docmonth, transformedResult, field, docname;
            var fields;
            var documentType = "";
            var accounts = [];
            var state = "";
            var jurisdiction = "";
            var dueData = "";
            var taxPayerName = "";
            var propertyType = "";
            var documentDate = "";
            var emptyString = "";

            for (i = 0; i < transformedResults.length; i++) {
                transformedResult = transformedResults[i];
                switch (transformedResult.status) {
                case "import_failed":
                case "import_succeeded":
                case "rejected":
                    fields = transformedResult.fields;
                    documentType = "";
                    accounts = [];
                    state = "";
                    jurisdiction = "";
                    dueData = "";
                    taxPayerName = "";
                    propertyType = "";
                    documentDate = "";

                    for (j = 0; j < fields.length; j++) {
                        field = fields[j];
                        if (field.name === "DocumentName") {

                            docname = field.value;
                            docname = docname.split("_");

                            for (k = 0; k < docname.length; k++) {

                                if (/20\d\d/.test(docname[k].substring(0, 4))) {
                                    docday = docname[k - 1];
                                    docmonth = docname[k - 2];
                                    if (docday.length === 1) {
                                        docday = "0" + docday;
                                    }
                                    if (docmonth.length === 1) {
                                        docmonth = "0" + docmonth;
                                    }
                                    documentDate = docmonth + "/" + docday + "/" + docname[k].substring(0, 4);
                                }

                            }
                        }
                        if (field.name === "DocumentType") {
                            documentType = field.value;
                        }
                        if (field.name === "accounts") {
                            accounts.push(field.value);
                        }
                        if (field.name === "State") {
                            state = field.value;
                        }
                        if (field.name === "TaxPayerName") {
                            taxPayerName = field.value;
                        }
                        if (field.name === "PropertyType") {
                            propertyType = field.value;
                        }
                        if (field.name === "AssessorName" || field.name === "CollectorName") {
                            jurisdiction = field.value;
                        }
                        if (field.name === "GrossAmountDueDate" || field.name === "ReturnDueDate" || field.name === "AppealDueDate") {
                            dueData = field.value;
                        }

                    }
                    accounts.join("|");

                    data.push({
                        documentType: documentType,
                        accounts: accounts + emptyString,
                        state: state,
                        jurisdiction: jurisdiction,
                        dueData: dueData,
                        taxPayerName: taxPayerName,
                        propertyType: propertyType,
                        reviewStatus: transformedResult.reviewStatus,
                        assignedStatus: transformedResult.assignedStatus,
                        notes: transformedResult.notes,
                        documentDate: documentDate,
                        errorMessage: transformedResult.errorMessage,
                        id: transformedResult.id,
                        workUnitStartTime: transformedResult.workUnitStartTime
                    });
                    break;
                }

            }
            return data;
        };


        if ($stateParams.id) {

            // Set status of Transformed Result to rejected
            $scope.rejectTransformedResult = function () {
                var statusBody = {
                    status: 'rejected'
                };

                API.updateTransformedResultStatus($scope.transformedResult.id, statusBody, function () {
                    if ($scope.nextResult()) {
                        toaster.pop('success', 'Status updated to rejected.', 'Auto advancing to next document.');
                        $scope.nextResult(true);
                    } else {
                        toaster.pop('success', 'Status updated to rejected.', 'All documents are complete.');
                        $location.path('/results');
                    }
                });
            };

            // Set Disabled link for EditTaxonomy
            $scope.setDisabledForEditTaxonomy = function () {
                var completed = 0, i, field;
                if ($scope.transformedResult) {
                    for (i = 0; i < $scope.transformedResult.fields.length; i++) {
                        field = $scope.transformedResult.fields[i];
                        if (field.name.toLowerCase() === 'assessorname') {
                            completed++;
                            if ($scope.AssessorName !== field.value) {
                                return true;

                            }
                        } else if (field.name.toLowerCase() === 'taxyear') {
                            completed++;
                            if ($scope.TaxYear !== field.value) {
                                return true;
                            }
                        } else if (field.name.toLowerCase() === 'state') {
                            completed++;
                            if ($scope.State !== field.value) {
                                return true;
                            }
                        }
                        if (completed === 3) {
                            return false;
                        }
                    }
                }
                return false;
            };

            // Get Work Unit
            $scope.getWorkUnit = function () {
                $scope.isTaxonomyOpen = true;
                var taxonomyResultsFields, i, j, k, field;
                // Get Work Unit by workunit Id
                API.getWorkUnit($scope.transformedResult.workUnitId, function (workUnit) {
                    taxonomyResultsFields = [];
                    // Show Document Name, Document Type and Document ID fields
                    for (j = 0; j < $scope.transformedConfiguration.commonFields.length; j++) {
                        for (i = 0; i < $scope.transformedResult.fields.length; i++) {
                            if ($scope.transformedResult.fields[i].name.toLowerCase() === $scope.transformedConfiguration.commonFields[j].name.toLowerCase()) {
                                taxonomyResultsFields.push($scope.transformedResult.fields[i]);
                                break;
                            }
                        }
                    }
                    // For remaining fields of taxonomy
                    for (i = 0; i < $scope.transformedConfiguration.EditTaxonomy.fields.length; i++) {
                        for (j = 0; j < workUnit.taxonomyResults.length; j++) {
                            for (k = 0; k < workUnit.taxonomyResults[j].fields.length; k++) {
                                if ($scope.transformedConfiguration.EditTaxonomy.fields[i].name.toLowerCase() === workUnit.taxonomyResults[j].fields[k].name.toLowerCase()) {
                                    field = JSON.parse(JSON.stringify(workUnit.taxonomyResults[j].fields[k]));
                                    field.displayField = $scope.transformedConfiguration.EditTaxonomy.fields[i];
                                    field.taxonomyResults = workUnit.taxonomyResults[j];
                                    field.oldValue = field.value;
                                    taxonomyResultsFields.push(field);
                                    break;
                                }
                            }
                        }
                    }
                    // Set workUnitResult 
                    $scope.workUnitResult = workUnit;
                    // Set taxonomyResultsFields for taxonomy UI 
                    $scope.workUnitResult.taxonomyResultsFields = taxonomyResultsFields;
                });
            };

            // Set extraction Rules for specific field
            $scope.extractionRules = function (extractionFields) {
                var f, ex, index, key;
                for (f = 0; f < extractionFields.length; f++) {
                    for (ex = 0; ex < $scope.workUnitResult.extractionResults.length; ex++) {
                        // get index of field in extractionResults
                        index = getIndexOf($scope.workUnitResult.extractionResults[ex].fields, extractionFields[f], "name");
                        // remove field from extractionResults
                        if (index !== -1) {
                            $scope.workUnitResult.extractionResults[ex].fields.splice(index, 1);
                        }
                    }
                    // remove field from evaluationContext
                    key = extractionFields[f] + '_confidence';
                    delete $scope.workUnitResult.evaluationContext[extractionFields[f]];
                    delete $scope.workUnitResult.evaluationContext[key];
                }
            };

            // Set taxonomy Rules for specific field
            $scope.taxonomyRules = function (taxonomyField, value) {
                if (angular.isUndefined($scope.workUnitResult.evaluationContext.TAXONOMY)) {
                    $scope.workUnitResult.evaluationContext.TAXONOMY = {};
                }
                // set field value from evaluationContext.TAXONOMY
                var key = taxonomyField + '_confidence';
                $scope.workUnitResult.evaluationContext.TAXONOMY[key] = 1;
                $scope.workUnitResult.evaluationContext.TAXONOMY[taxonomyField] = value;
            };

            // Set taxonomy Rules for address field
            $scope.taxonomyRulesForAddress = function (taxonomyField, value, addressField) {
                if (angular.isUndefined($scope.workUnitResult.evaluationContext.TAXONOMY)) {
                    $scope.workUnitResult.evaluationContext.TAXONOMY = {};
                }
                // set field value from evaluationContext.TAXONOMY for address
                var key = taxonomyField + '_confidence';
                $scope.workUnitResult.evaluationContext.TAXONOMY[key] = 1;
                $scope.workUnitResult.evaluationContext.TAXONOMY[taxonomyField] = "Yes";
                $scope.workUnitResult.evaluationContext.TAXONOMY.addressvalid = "Yes";
                $scope.workUnitResult.evaluationContext.TAXONOMY[addressField] = value;
            };

            /* 1) Update work unit 
             2) Update Document by classification
             3) Delete related information from transformedResult */
            $scope.updateWorkUnit = function () {
                // Get document type
                var documentTypeValue = $filter('filter')($scope.transformedResult.fields, function (d) {
                    return d.name === 'DocumentType';
                })[0];

                var documentType = documentTypeValue.value;
                var extractionFields, i, j, field;

                for (i = 0; i < $scope.workUnitResult.taxonomyResults.length; i++) {
                    for (j = 0; j < $scope.workUnitResult.taxonomyResults[i].fields.length; j++) {
                        field = $filter('filter')($scope.workUnitResult.taxonomyResultsFields, function (d) {
                            return !angular.isUndefined(d.taxonomyResults) && d.taxonomyResults._id === $scope.workUnitResult.taxonomyResults[i]._id && d.name === $scope.workUnitResult.taxonomyResults[i].fields[j].name;
                        })[0];
                        // check field present
                        if (field) {
                            $scope.workUnitResult.taxonomyResults[i].fields[j].value = field.value;
                            if (field.value !== field.oldValue) {
                                $scope.workUnitResult.taxonomyResults[i].fields[j].confidence = 1;
                                // Do operation for perticular field
                                if (field.name.toLowerCase() === 'hasaccountnumber') {
                                    $scope.taxonomyRules(field.name, field.value);
                                    extractionFields = [field.name, 'accountnumber'];
                                    $scope.extractionRules(extractionFields);

                                } else if (field.name.toLowerCase() === 'streetaddress') {
                                    $scope.taxonomyRulesForAddress('hasstreetaddress', field.value, field.name);
                                } else if (field.name.toLowerCase() === 'appealcity' || field.name.toLowerCase() === 'city') {

                                    if (documentType.toLowerCase() === "assessment") {
                                        $scope.taxonomyRulesForAddress('hasappealcity', field.value, 'appealcity');
                                    } else if (documentType.toLowerCase() === "return") {
                                        $scope.taxonomyRulesForAddress('hasreturncity', field.value, 'returncity');
                                    } else if (documentType.toLowerCase() === "taxbill") {
                                        $scope.taxonomyRulesForAddress('haspaymentcity', field.value, 'paymentcity');
                                    }
                                } else if (field.name.toLowerCase() === 'appealstate' || field.name.toLowerCase() === 'state') {

                                    if (documentType.toLowerCase() === "assessment") {
                                        $scope.taxonomyRulesForAddress('hasappealstate', field.value, 'appealstate');
                                    } else if (documentType.toLowerCase() === "return") {
                                        $scope.taxonomyRulesForAddress('hasreturnstate', field.value, 'returnstate');
                                    } else if (documentType.toLowerCase() === "taxbill") {
                                        $scope.taxonomyRulesForAddress('haspaymentstate', field.value, 'paymentstate');
                                    }
                                } else if (field.name.toLowerCase() === 'appealzip' || field.name.toLowerCase() === 'zip') {

                                    if (documentType.toLowerCase() === "assessment") {
                                        $scope.taxonomyRulesForAddress('hasappealzip', field.value, 'appealzip');
                                    } else if (documentType.toLowerCase() === "return") {
                                        $scope.taxonomyRulesForAddress('hasreturnzip', field.value, 'zip');
                                    } else if (documentType.toLowerCase() === "taxbill") {
                                        $scope.taxonomyRulesForAddress('haspaymentzip', field.value, 'zip');
                                    }
                                    $scope.workUnitResult.evaluationContext.TAXONOMY.addressvalid = "Yes";
                                } else if (field.name.toLowerCase() === 'appealduedate') {

                                    $scope.workUnitResult.evaluationContext.TAXONOMY.hasappealduedate_confidence = 1;
                                    $scope.workUnitResult.evaluationContext.TAXONOMY.hasappealduedate = "Yes";
                                    $scope.workUnitResult.evaluationContext.TAXONOMY.appealduedate = field.value;
                                } else if (field.name.toLowerCase() === 'hasmarketvalue') {
                                    $scope.taxonomyRules(field.name, field.value);
                                    extractionFields = [field.name, 'marketvalue', 'marketvalueland', 'marketvaluebuilding', 'marketvaluemisc', 'marketvaluebreakdown'];
                                    $scope.extractionRules(extractionFields);
                                } else if (field.name.toLowerCase() === 'hasassessedvalue') {
                                    $scope.taxonomyRules(field.name, field.value);
                                    extractionFields = [field.name, 'assessedvalue', 'assessedvalueland', 'assessedvaluebuilding', 'assessedvaluemisc', 'assessedvaluebreakdown'];
                                    $scope.extractionRules(extractionFields);

                                } else if (field.name.toLowerCase() === 'hastaxablevalue') {
                                    $scope.taxonomyRules(field.name, field.value);
                                    extractionFields = [field.name, 'taxablevalue'];
                                    $scope.extractionRules(extractionFields);


                                } else if (field.name.toLowerCase() === 'paymentschedule') {
                                    $scope.taxonomyRules(field.name, field.value);
                                    extractionFields = ['hasgrossamountdue', 'grossamountdue', 'grossamountduedate', 'billtype', 'hasfirstinstallment', 'firstinstallmentamountdue', 'firstinstallmentduedate', 'hassecondinstallment', 'secondinstallmentamountdue', 'secondinstallmentduedate', 'hasthirdinstallment', 'thirdinstallmentamountdue', 'thirdinstallmentduedate', 'hasfourthinstallment', 'fourthinstallmentamountdue', 'fourthinstallmentduedate', 'fullamountdue'];
                                    $scope.extractionRules(extractionFields);

                                } else if (field.name.toLowerCase() === 'discountoption') {
                                    $scope.taxonomyRules(field.name, field.value);
                                    extractionFields = ['hasdiscountamountdue', 'discountamountdue', 'discountamountpercentage', 'hasdiscountduedate', 'discountduedate', 'hasdiscountamountsdue', 'discountamountdue_2', 'discountamountdue_3', 'discountamountdue_4', 'hasdiscountamountdue_3', 'hasdiscountamountdue_4', 'discountamountpercentage_2', 'discountamountpercentage_3', 'discountamountpercentage_4', 'hasdiscountthirdpercentage', 'hasdiscountfourthpercentage', 'hasdiscountduedates', 'discountduedate_2', 'discountduedate_3', 'discountduedate_4', 'hasdiscountduedate_3', 'hasdiscountduedate_4'];
                                    $scope.extractionRules(extractionFields);

                                }
                            }
                            delete field.oldValue; // delete oldvalue property from field
                        }

                    }
                }

                delete $scope.workUnitResult.taxonomyResultsFields; // delete taxonomyResultsFields property from workUnitResult

                // Call API updateWorkUnit
                API.updateWorkUnit($scope.workUnitResult._id, $scope.workUnitResult, function () {
                    // User back to Transform Results List
                    $location.path('/results');
                });
            };

            // Check assessorname,taxyear and state to disabled  edit taxonomy href
            $scope.disabledTaxonomy = function (field) {
                if (field.name.toLowerCase() === 'assessorname') {
                    $scope.AssessorName = field.value;
                } else if (field.name.toLowerCase() === 'taxyear') {
                    $scope.TaxYear = field.value;
                } else if (field.name.toLowerCase() === 'state') {
                    $scope.State = field.value;
                }
            };

            //Updates only specific fields
            $scope.updateField = function (fieldName, fieldValue, reload) {
                var fields = [], field, i;

                //Only results with import_failed status can be updated
                if ($scope.transformedResult.status !== 'import_failed') {
                    return;
                }

                //Make sure we have a valid field value
                if (!fieldValue) {
                    return;
                }

                for (i = 0; i < $scope.transformedResult.fields.length; i++) {
                    field = JSON.parse(JSON.stringify($scope.transformedResult.fields[i]));

                    if (field.name.toLowerCase() === fieldName) {
                        field.value = fieldValue;
                        delete field.displayField;
                        fields.push(field);

                        break;
                    }
                }

                API.updateTransformedResult($scope.transformedResult.id, fields, false, function () {
                    if (reload) {
                        toaster.pop('success', 'Refreshing page...');
                        $timeout(function () {
                            $window.location.reload();
                        }, 2000);
                    }
                });
            };

            $scope.updateTransformedResult = function (reload) {
                var fields = [];
                var foundError = false, i, field, index, pipeValue, j;

                //Only results with import_failed status can be updated
                if ($scope.transformedResult.status !== 'import_failed') {
                    return;
                }

                // check Mandatory field and pipe-delimited values
                for (i = 0; i < $scope.transformedResult.fields.length; i++) {
                    field = JSON.parse(JSON.stringify($scope.transformedResult.fields[i]));
                    if (field.displayField.isMandatory && (field.value === "" || !field.value)) {
                        $scope.transformedResult.fields[i].displayField.hasError = true;
                        foundError = true;
                    }
                    if (field.name.toLowerCase() === 'installmentduedates' || field.name.toLowerCase() === 'installments') {
                        if (!angular.isUndefined(field.displayField.Currency) && field.value !== "") {
                            field.value = field.value.toString().replace(field.displayField.Currency, '');
                        }
                        delete field.displayField;
                        index = getIndexOf(fields, field.name, "name");
                        if (index !== -1) {
                            //installments values are save in database as 123|12345|5678 
                            // created values in this format 123|12345|5678 
                            fields[index].value += fields[index].value ? (field.value ? "|" + field.value : field.value) : field.value;
                        } else {

                            fields.push(field);
                        }
                    } else if (field.displayField.pipeDelimitedList) {
                        pipeValue = "";
                        for (j = 0; j < field.value.length; j++) {
                            //AccountIDs values are save in database as 123|12345|5678 
                            // created values in this format 123|12345|5678 
                            pipeValue += pipeValue ? (field.value[j] ? "|" + field.value[j] : field.value[j]) : field.value[j];
                        }
                        if (field.displayField.isMandatory && pipeValue === "") {
                            $scope.transformedResult.fields[i].displayField.hasError = true;
                            foundError = true;
                        }
                        field.value = pipeValue;
                        if (!angular.isUndefined(field.displayField.Currency) && field.value !== "") {
                            field.value = field.value.toString().replace(field.displayField.Currency, '');
                        }
                        fields.push(field);
                        delete field.displayField;
                    } else if (field.name.toLowerCase() === 'reviewstatus') {
                        field.value = $scope.transformedResult.reviewStatus;
                        fields.push(field);
                        delete field.displayField;
                    } else if (field.name.toLowerCase() === 'assignedstatus') {
                        field.value = $scope.transformedResult.assignedStatus;
                        fields.push(field);
                        delete field.displayField;
                    } else if (field.name.toLowerCase() === 'notes') {
                        field.value = $scope.transformedResult.notes;
                        fields.push(field);
                        delete field.displayField;
                    } else {
                        if (!angular.isUndefined(field.displayField.Currency) && field.value !== "") {
                            field.value = field.value.toString().replace(field.displayField.Currency, '');
                        }
                        delete field.displayField;
                        fields.push(field);
                    }
                }

                if (!foundError) {
                    API.updateTransformedResult($scope.transformedResult.id, fields, reload, function () {
                        if (reload) {
                            // Data returned from this API call will always state the status as 'ready_for_import'. Have to check again.

                            API.getTransformedResult($scope.transformedResult.id, $location.search(), function (row) {
                                if (row.status === 'import_failed') {
                                    //Get the latest error message
                                    if (row.errorMessage) {
                                        $scope.transformedResult.errorMessage = row.errorMessage;
                                    } else {
                                        //Scenario should never happen - there should
                                        //always be an error message accompanying 
                                        //import_failed status
                                        delete $scope.transformedResult.errorMessage;
                                    }

                                    toaster.pop('error', 'Failed to import.');
                                } else {
                                    if ($scope.nextResult()) {
                                        toaster.pop('success', 'Import successful.', 'Auto advancing to next document.');
                                        $scope.nextResult(true);
                                    } else {
                                        toaster.pop('success', 'Import successful', 'All documents are complete.');
                                        $location.path('/results');
                                    }
                                }
                            });
                        }
                    });
                } else {
                    // show toaster if required fields not entered
                    toaster.pop('error', "Please enter required field(s).");
                }
            };

            API.getTransformedResult($stateParams.id, $location.search(), function (row) {
                $scope.transformedResult = row;
                // Get document type
                var documentType = $filter('filter')($scope.transformedResult.fields, function (d) {
                    return d.name === 'DocumentType';
                })[0];
                // getTransformedConfiguration by type
                API.getTransformedConfiguration(documentType.value, function (transformedConfiguration) {
                    var fields = [], field, isFound = false, i, j, installmentsValue, date, month, day;
                    $scope.transformedConfiguration = transformedConfiguration;
                    for (i = 0; i < transformedConfiguration.fields.length; i++) {
                        isFound = false;
                        for (j = 0; j < $scope.transformedResult.fields.length; j++) {
                            if (transformedConfiguration.fields[i].name.toLowerCase() === $scope.transformedResult.fields[j].name.toLowerCase()) {
                                isFound = true;

                                field = JSON.parse(JSON.stringify($scope.transformedResult.fields[j]));
                                field.displayField = transformedConfiguration.fields[i];
                                if (field.name.toLowerCase() === 'installmentduedates' || field.name.toLowerCase() === 'installments') {
                                    installmentsValue = field.value.split('|');
                                    if (installmentsValue.length > field.displayField.number) {
                                        field.value = installmentsValue[field.displayField.number];
                                    } else {
                                        field.value = "";
                                    }

                                } else if (transformedConfiguration.fields[i].pipeDelimitedList) {
                                    field.value = angular.isUndefined(field.value) || field.value === 'null' ? [""] : field.value.split('|');
                                }
                                field.value = angular.isUndefined(field.value) || field.value === 'null' ? "" : field.value;
                                if (!angular.isUndefined(field.displayField.Currency) && field.value !== "" && field.value.toString().indexOf(field.displayField.Currency) === -1) {
                                    field.value = field.displayField.Currency + field.value;
                                }
                                if (!angular.isUndefined(field.displayField.DateFormat) && field.value !== "") {
                                    date = new Date(field.value);
                                    month = (1 + date.getMonth()).toString();
                                    month = month.length > 1 ? month : '0' + month;
                                    day = date.getDate().toString();
                                    day = day.length > 1 ? day : '0' + day;
                                    field.value = (month + '/' + day + '/' + date.getFullYear());
                                }
                                fields.push(field);
                                $scope.disabledTaxonomy(field);

                                break;
                            }
                        }
                        if (!isFound) {
                            field = {
                                name: transformedConfiguration.fields[i].name,
                                value: "",
                                displayField: transformedConfiguration.fields[i]
                            };

                            if (transformedConfiguration.fields[i].pipeDelimitedList) {
                                field.value = [""];
                            }
                            fields.push(field);
                            $scope.disabledTaxonomy(field);
                        }

                    }
                    $scope.transformedResult.fields = fields;

                });
            });

            $scope.embededURL = function (src) {
                if (src) {
                    return $sce.trustAsResourceUrl(src.replace("app.box.com/s", "app.box.com/embed_widget/s"));
                }
            };

            $scope.disableActions = function () {
                if ($scope.transformedResult) {
                    return $scope.transformedResult.status !== 'import_failed';
                }
                return true;
            };

            $scope.disableEdit = function () {
                if ($scope.transformedResult && $scope.transformedResult.status === 'import_failed') {
                    return false;
                }

                return true;
            };
        } else {

            var queryString = $location.search();
            $scope.filter = queryString.filter;


            var sort = [];
            if (queryString.sort) {
                sort = queryString.sort.split(",");
            }
            $scope.sort = sort;

            //get css class for active sorting
            $scope.getIconClass = function (columnName) {
                var descendingColumnName = "-" + columnName;
                if (_.contains(sort, columnName)) {
                    return 'glyphicon-sort-by-alphabet';
                }
                if (_.contains(sort, descendingColumnName)) {
                    return 'glyphicon-sort-by-alphabet-alt';
                }
                return '';
            };

            //change sorting when column was click
            $scope.setOrderBy = function (columnName) {
                var ascendingColumnName = columnName,
                    descendingColumnName = "-" + columnName;

                var index = sort.indexOf(ascendingColumnName);
                if (index !== -1) {
                    sort[index] = descendingColumnName;
                } else {
                    index = sort.indexOf(descendingColumnName);
                    if (index !== -1) {
                        sort[index] = ascendingColumnName;
                    } else {
                        sort.push(ascendingColumnName);
                    }
                }
                $location.search('sort', sort.join());
                $scope.loadData();
            };
            $scope.loadData = function () {
                API.searchTransformedResults($location.search(), function (result) {
                    $scope.data = createData(result.items);
                    $scope.total = result.total;
                    $scope.page.value = $location.search().page || 1;
                    $scope.totalPages = 0;
                    if ($scope.total) {
                        $scope.totalPages = Math.ceil($scope.total / pageSize);
                    }
                    $scope.loaded = true;
                });
            };
            $scope.loadData();
        }

        $scope.getFormattedDate = function (dateValue) {
            return $filter('date')(dateValue, 'short');
        };

        //Resets the column sorting order
        $scope.resetSortOrder = function () {
            $scope.sort.splice(0, $scope.sort.length);
            $location.search('sort', $scope.sort.join());
            $scope.loadData();
        };

        //Checks if column sorting is applied
        $scope.isSortOrderSet = function () {
            return $scope.sort.length > 0;
        };
        //selected page changed
        $scope.pageChange = function () {
            $location.search('page', $scope.page.value);
            $scope.loadData();
        };
        //search by keyword
        $scope.search = function () {
            $location.search('filter', $scope.filter);
            $scope.loadData();
        };

        $scope.openResultDetails = function (resultId) {
            $location.path('/results/' + resultId);
        };

        $scope.nextResult = function (goTo) {
            if (!$scope.transformedResult || !$scope.transformedResult.next) {
                return null;
            }
            if (goTo) {
                $location.path('/results/' + $scope.transformedResult.next);
            } else {
                return true;
            }
        };

        $scope.previousResult = function (goTo) {
            if (!$scope.transformedResult || !$scope.transformedResult.prev) {
                return null;
            }
            if (goTo) {
                $location.path('/results/' + $scope.transformedResult.prev);
            } else {
                return true;
            }
        };

        $scope.getUserName = function (userId) {
            if (!$scope.users) {
                return '';
            }

            var i;
            for (i = 0; i < $scope.users.length; i++) {
                if ($scope.users[i].id === userId) {
                    return $scope.users[i].username;
                }
            }

            if (userId !== 'Not Assigned') {
                return 'Unknown user';
            }
            return userId;
        };

        API.getUserList(function (users) {
            $scope.users = users.filter(function (user) {
                return !user.isAdmin;
            });
        });
    }])
    .controller('ReportsCtrl', ['$scope', '$state', '$location', '$stateParams', 'API', function ($scope, $state, $location, $stateParams, API) {
        var orderByString = $location.search().orderBy;

        $scope.orderBy = orderByString ? orderByString.split(",") : ['+name'];

        $scope.reports = [];

        $scope.report = {};

        $scope.executeReport = function (fileName) {
            var index = -1, i;

            for (i = 0; i < $scope.reports.length; ++i) {
                if ($scope.reports[i].fileName === fileName) {
                    index = i;
                }
            }

            if (index !== -1) {
                $scope.reports[index].status = 'EXECUTING';

                API.executeReport($scope.reports[index].fileName).finally(function () {
                    $state.reload();
                });
            }
        };

        $scope.cancelReport = function (fileName) {
            var index = -1, i;

            for (i = 0; i < $scope.reports.length; ++i) {
                if ($scope.reports[i].fileName === fileName) {
                    index = i;
                }
            }

            if (index !== -1) {
                $scope.reports[index].status = 'FAILED';

                API.cancelReport($scope.reports[index].fileName);
            }
        };

        $scope.getIconClass = function (columnName) {
            var ascendingColumnName = "+" + columnName;
            var descendingColumnName = "-" + columnName, i;
            for (i = 0; i < $scope.orderBy.length; i++) {
                switch ($scope.orderBy[i]) {
                case descendingColumnName:
                    return 'glyphicon-sort-by-alphabet-alt';
                case ascendingColumnName:
                    return 'glyphicon-sort-by-alphabet';
                default:
                }
            }
            return '';
        };

        $scope.getURL = function (fileName) {
            return '/api/reports/download/' + fileName;
        };

        $scope.setOrderBy = function (columnName) {
            var ascendingColumnName = "+" + columnName;
            var descendingColumnName = "-" + columnName, i;
            switch ($scope.orderBy[0]) {
            case descendingColumnName:
                $scope.orderBy[0] = ascendingColumnName;
                break;
            case ascendingColumnName:
                $scope.orderBy[0] = descendingColumnName;
                break;
            default:
                for (i = 0; i < $scope.orderBy.length; i++) {
                    switch ($scope.orderBy[i]) {
                    case descendingColumnName:
                    case ascendingColumnName:
                        $scope.orderBy.splice(i, 1);
                        break;
                    default:
                    }
                }
                $scope.orderBy.unshift(ascendingColumnName);
            }
        };

        $scope.updateReport = function () {
            API.updateReport($stateParams.id, $scope.report, function () {
                $location.path('/reports');
            });
        };

        if ($stateParams.id) {
            API.getReportDetails($stateParams.id, function (report) {
                $scope.report = report;
            });
        } else {
            API.getReports(function (reports) {
                $scope.reports = reports;
            });
        }
    }])
    .controller('UserProfileCtrl', ['$rootScope', '$scope', 'API',
        function ($rootScope, $scope, API) {
            //Although named UserProfileCtrl, only reset password function is available for now
            //Controller can be enhanced in the future with more features
            $scope.newPassword = '';

            $scope.resetPassword = function () {
                if ($scope.newPassword.length > 0) {
                    API.resetSelfPassword({
                        password: $scope.newPassword
                    },
                        function () {
                            //Log out and force the user to login again
                            $rootScope.logout(true);
                        });
                }
            };
        }
        ]);
