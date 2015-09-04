/*
 * Copyright (C) 2014, 2015 TopCoder Inc., All Rights Reserved.
 */

'use strict';

/**
 * Angular main application file
 *
 * @author kata.choi
 * @version 1.1
 * 
 * Changes in 1.1:
 * 1. add getTransformedResult to API service
 * 2. rename getTransformedResult to searchTransformedResults in API service
 * */

/*global $, angular, typeof */

// Declare app level module
var main = angular.module('engrafa-im', [
    'ngAnimate',
    'ngRoute',
    'ngCookies',
    'toaster',
    'ui.router',
    'ui.bootstrap',
    'angularSpinner',
    'engrafa.directives',
    'engrafa.controllers',
    'rt.encodeuri'
]);

//store the user session
main.service('Session', [function () {

    return {
        isAuthenticated: function () {
            return (typeof(this.user) !== "undefined");
        },
        reset: function () {
            delete this.user;
        },
        setUser: function (user) {
            this.user = user;
        }
    };
}]);

main.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$httpProvider', function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {
    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'partials/home.html',
            controller: 'LoginCtrl'
        })
        .state('login', {
            url: '/login',
            templateUrl: 'partials/login.html',
            controller: 'LoginCtrl'
        })
        .state('usermanagement', {
            abstract: true,
            url: '/users',
            templateUrl: 'partials/user-management.html',
            controller: 'UserManagementCtrl'
        })
        .state('usermanagement.list', {
            url: '',
            templateUrl: 'partials/user-management.list.html'
        })
        .state('usermanagement.new', {
            url: '/new',
            templateUrl: 'partials/new-user.html'
        })
        .state('usermanagement.update', {
            url: '/:id',
            templateUrl: 'partials/user-details.html',
            controller: function ($scope, $stateParams) {
                $scope.getUserList(function (users) {
                    users.forEach(function (user) {
                        if(user.id === $stateParams.id) {
                            $scope.currentUser = user;
                        }
                    });
                });
            }
        })
        .state('clientconfig', {
            abstract: true,
            url: '/clientconfigs',
            templateUrl: 'partials/client-configs.html',
            controller: 'ClientConfigManagementCtrl'
        })
        .state('clientconfig.list', {
            url: '',
            templateUrl: 'partials/client-configs.list.html'
        })
        .state('clientconfig.update', {
            url: '/:id',
            templateUrl: 'partials/client-configs.details.html',
            controller: function ($scope, $stateParams) {
                $scope.getConfigList(function (configs) {
                    configs.forEach(function (config) {
                        if (config.id === $stateParams.id) {
                            $scope.currentConfig = config;
                        }
                    });
                });
            }
        })
        .state('workflowconfig', {
            abstract: true,
            url: '/workflowconfigs',
            templateUrl: 'partials/workflow-configs.html',
            controller: 'WorkflowConfigManagementCtrl'
        })
        .state('workflowconfig.list', {
            url: '',
            templateUrl: 'partials/workflow-configs.list.html'
        })
        .state('workflowconfig.update', {
            url: '/:id',
            templateUrl: 'partials/workflow-configs.details.html',
            controller: function ($scope, $stateParams) {
                $scope.getConfigList(function (configs) {
                    configs.forEach(function (config) {
                        if (config.id === $stateParams.id) {
                            $scope.currentConfig = config;
                        }
                    });
                });
            }
        })
        .state('result', {
            abstract : true,
            url: '/results',
            templateUrl: 'partials/transformed-result.html'
        })
        .state('result.list', {
            url: '',
            templateUrl: 'partials/transformed-result.list.html',
            controller: 'TransformedResultCtrl'
        })
        .state('result.details', {
            url: '/:id',
            templateUrl: 'partials/transformed-result.details.html',
            controller: 'TransformedResultCtrl'

        })
        .state('reports', {
            abstract: true,
            url: '/reports',
            templateUrl: 'partials/reports.html'
        })
        .state('reports.list', {
            url: '',
            templateUrl: 'partials/reports.list.html',
            controller: 'ReportsCtrl'
        })
        .state('reports.details', {
            url: '/:id',
            templateUrl: 'partials/report.details.html',
            controller: 'ReportsCtrl'
        })
        .state('passwordreset', {
            url: '/reset-password',
            templateUrl: 'partials/user-profile.html',
            controller: 'UserProfileCtrl'
        });

    $locationProvider.html5Mode(true);

    $httpProvider.interceptors.push(['$rootScope', 'Session', 'toaster', function ($rootScope, Session, toaster) {
        return {
            //add apikey to the request header and add spinner indicator
            request: function (config) {
                if (!config.config || !config.config.hideSpinner) {
                    $rootScope.showSpinner();
                }

                return config;
            },
            //display pop message when update succeed
            response: function (response) {
                $rootScope.hideSpinner();
                if (response.status === 200 && response.config.method === 'PUT') {
                    toaster.pop('success', "Changes have been saved.");
                }
                return response;
            }
        };
    }]);
}]);

/**
 * authentication module
 */
main.provider('Auth', function () {
    this.$get = [
        '$rootScope',
        'Session',
        '$cookies',
        '$location',
        '$http',
        'toaster',
        function ($rootScope, Session, $cookies, $location, $http, toaster) {
            var $scope = $rootScope.$new();

            /**
             * The authentication ended successfully
             * @param user The logged in user information
             */
            function authenticateSuccessfully(user) {
                $rootScope.hideSpinner();
                Session.setUser(user);
                if (user.isAdmin) {
                    $scope.$emit('admin login', Session);
                }
                if (!user.isAdmin) {
                    $scope.$emit('user login', Session);
                }
                $rootScope.isReady = true;
            }

            /**
             * Check if the user has logged in successfully
             * @returns {*}
             */
            $scope.checkAuthentication = function () {
                return $http({
                    method: 'GET',
                    url: '/api/auth'
                }).success(function (data) {
                    $rootScope.hideSpinner();
                    if (data === "false") {
                        $location.path('/login');
                        return;
                    }
                    //  user already logged in
                    authenticateSuccessfully(data);
                }).error(function () {
                   $rootScope.hideSpinner();
                    Session.reset();
                    $rootScope.isReady = true;
                    $location.path('/');
                });
            };

            $scope.login = function(username, password) {
                $scope.auth(username, password);
            };
            $scope.logout = function(passwordReset) {
                $http({
                    method: 'DELETE',
                    url: '/api/auth'
                }).success(function(){
                    Session.reset();
                    $rootScope.isReady = true;
                    if (passwordReset) {
                        $location.path('/login').search({passwordReset: 'true'});
                    } else {
                        $location.path('/login');
                    }
                    $scope.$emit('user logout', Session);
                }).error(function(){
                    Session.reset();
                    $rootScope.isReady = true;
                    $location.path('/login');
                    $scope.$emit('user logout', Session);
                });

            };
            $scope.auth = function(username, password) {
                return $http({
                    method: 'POST',
                    url: '/api/auth',
                    data:{username: username, password: password}
                }).success(function(data) {
                    authenticateSuccessfully(data);
                }).error(function(){
                   $rootScope.hideSpinner();
                   Session.reset();
                   $rootScope.isReady = true;
                   toaster.pop('error', "Invalid username or password.");
                });
            };

            return $scope;
        }];
});


main.run(["$rootScope", "$state", "$window", "API", "usSpinnerService", 'toaster', '$location', 'Session', 'Auth',
    function ($rootScope, $state, $window,  API, usSpinnerService, toaster, $location, Session, Auth) {
        $rootScope.$state = $state;



        /**
         * download a file, simply redirect to url
         * @param {String} url the url
         */
        $rootScope.download = function (url) {
            $window.location.href = url;
        };

        /**
         * show ui spinner and block UI
         */
        $rootScope.showSpinner = function () {
            $('.alpha').show();
            usSpinnerService.spin('main');
        };

        /**
         * hide ui spinner and unblock UI
         */
        $rootScope.hideSpinner = function () {
            $('.alpha').hide();
            usSpinnerService.stop('main');
        };

        /**
         * Handler error returned by API
         * Show alert popup with error message
         * @param response the response text
         */
        $rootScope.handleHttpError = function (response) {
            var msg = '';
            if(response.errors){
                Object.keys(response.errors).forEach(function(err){
                    msg += response.errors[err].message + '\n';
                    msg = msg.replace('Path', '');
                });
            }else{
                msg = response.message;
            }
            $rootScope.hideSpinner();
            toaster.pop('error', 'API error', msg, 'html');
        };

        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState){
            // on first request try to see if the user is already authenticated
            if (!fromState.name) {
                Auth.checkAuthentication();
                return;
            }

            if(toState.name === 'login' || toState.name === 'home') {
                return;
            }

            if(!Session.isAuthenticated()) {
                $location.path('/login');
            }
        });

        $rootScope.logout = function(passwordReset) {
            Auth.logout(passwordReset);
        };
    }]);
/**
 * API service
 */
main.factory("API", ["$http", "$rootScope", function ($http, $rootScope) {
    var emptyFun = function () { return null; };
    var service = {};

    service.getUserList = function (callback) {
        return $http({
            method: 'GET',
            url: '/api/users'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.addUser = function (data, callback) {
        var password = data.password;
        delete data.password;
        return $http({
            method: 'POST',
            url: '/api/users?password=' + password,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.updateUser = function (data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/users/' + data.id,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.updatePassword = function (data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/users/' + data.id + '/password?password=' + data.password
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.resetSelfPassword = function (data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/resetPassword?password=' + data.password
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.deleteUser = function (id, callback) {
        return $http({
            method: 'DELETE',
            url: '/api/users/' + id
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.getClientConfigs = function(callback) {
        return $http({
            method: 'GET',
            url: '/api/clientAPIConfigurations/'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.addClientConfig = function(data, callback) {
        return $http({
            method: 'POST',
            url: '/api/clientAPIConfigurations/',
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.updateClientConfig = function(data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/clientAPIConfigurations/' + data.id,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.deleteClientConfig = function(id, callback) {
        return $http({
            method: 'DELETE',
            url: '/api/clientAPIConfigurations/' + id
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.getWorkflowConfigs = function(callback) {
        return $http({
            method: 'GET',
            url: '/api/workflowIntegrationConfigurations/'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.addWorkflowIntegrationConfig = function(data, callback) {
        return $http({
            method: 'POST',
            url: '/api/workflowIntegrationConfigurations/',
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.updateWorkflowIntegrationConfig = function(data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/workflowIntegrationConfigurations/' + data.id,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.deleteWorkflowIntegrationConfig = function(id, callback) {
        return $http({
            method: 'DELETE',
            url: '/api/workflowIntegrationConfigurations/' + id
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.addTransformationRule = function(workflowId, rule, callback) {
        return $http({
            method: 'POST',
            url: '/api/workflowIntegrationConfigurations/' + workflowId + '/transformationRules',
            data: rule
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.deleteTransformationRule = function(workflowId, ruleId, callback) {
        return $http({
            method: 'DELETE',
            url: '/api/workflowIntegrationConfigurations/' + workflowId + '/transformationRules/' + ruleId
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.addMappingRule = function(workflowId, data, callback) {
        return $http({
            method: 'POST',
            url: '/api/workflowIntegrationConfigurations/' + workflowId + '/mappingRules',
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.deleteMappingRule = function(workflowId, ruleId, callback) {
        return $http({
            method: 'DELETE',
            url: '/api/workflowIntegrationConfigurations/' + workflowId + '/mappingRules/' + ruleId
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.getTransformedResultList = function(status, callback) {
        return $http({
            method: 'GET',
            url: '/api/transformedResults?resultStatus=' + status
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.searchTransformedResults = function(params, callback) {
        return $http({
            method: 'GET',
            url: '/api/transformedResults',
            params: params
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.getTransformedResult = function(id, params, callback) {
        return $http({
            method: 'GET',
            url: '/api/transformedResults/' + id,
            params: params
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    service.updateTransformedResult = function(id, data, readyToImport, callback) {
        readyToImport = typeof readyToImport !== 'undefined' ? readyToImport : true;

        return $http({
            method: 'PUT',
            url: '/api/transformedResults/' + id + '?import=' + readyToImport,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };
    // get Transformed Configuration
    service.getTransformedConfiguration = function(type, callback) {
        return $http({
            method: 'GET',
            url: '/api/transformedConfiguration/' + type
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };
     // update Transformed Result Status
    service.updateTransformedResultStatus = function(id, data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/transformedResultStatus/' + id,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };
    //get WorkUnit
    service.getWorkUnit = function(workUnitId, callback) {
        return $http({
            method: 'GET',
            url: '/api/workUnit/' + workUnitId
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };
    //update WorkUnit
    service.updateWorkUnit = function(workUnitId, data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/workUnit/' + workUnitId,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    // Get reports.

    service.getReports = function(callback) {
        return $http({
            method: 'GET',
            url: '/api/reports'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    // Execute report.

    service.executeReport = function(fileName, callback) {
        return $http({
            method: 'POST',
            url: '/api/reports/execute',
            data: {
                fileName: fileName
            },
            timeout: 0,
            config: {
                hideSpinner: true
            }
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    // Cancel report.

    service.cancelReport = function(fileName, callback) {
        return $http({
            method: 'POST',
            url: '/api/reports/cancel',
            data: {
                fileName: fileName
            },
            timeout: 0,
            config: {
                hideSpinner: true
            }
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    //Get a specific report
    service.getReportDetails = function (reportId, callback) {
        return $http({
            method: 'GET',
            url: '/api/reports/' + reportId
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    }

    //Update a specific report
    service.updateReport = function (reportId, data, callback) {
        return $http({
            method: 'PUT',
            url: '/api/reports/' + reportId,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    }

    return service;
}]);
