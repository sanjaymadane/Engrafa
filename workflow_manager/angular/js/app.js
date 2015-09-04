/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

'use strict';

/**
 * Angular main application file
 *
 * @author Sky_
 * @version 1.1
 *
 * changes in 1.1:
 * 1. add clientId and workflowId to saveWorkflow from API service.
 */
/*global angular, _, $ */

// Declare app level module
var main = angular.module('engrafa', [
    'ngAnimate',
    'ngRoute',
    'ngTable',
    'toaster',
    'ui.router',
    'ui.bootstrap',
    'ui.codemirror',
    'angularSpinner',
    'engrafa.directives',
    'engrafa.controllers'
]);

main.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {
    $urlRouterProvider.otherwise('/');
    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'partials/home.html',
            controller: 'HomeCtrl'
        })
        .state('jobs', {
            url: '/jobs',
            templateUrl: 'partials/jobs.html',
            controller: 'JobsCtrl'
        })
        .state('data', {
            url: '/data',
            templateUrl: 'partials/data.html',
            controller: 'DataCtrl'
        })
        .state('reports', {
            url: '/reports',
            templateUrl: 'partials/reports.html',
            controller: 'ReportsCtrl'
        })
        .state('settings', {
            url: '/settings',
            templateUrl: 'partials/settings.html',
            controller: 'SettingsCtrl'
        });
    $locationProvider.html5Mode(true);
}]);


main.run(["$rootScope", "$state", "$window", "API", "usSpinnerService", 'toaster',
    function ($rootScope, $state, $window,  API, usSpinnerService, toaster) {
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
         * @param httpStatus the http status of error
         */
        $rootScope.handleHttpError = function (response, httpStatus) {
            var msg = response.error;
            if (!msg) {
                msg = "Unknown error, http status: " + httpStatus + ".";
            }
            $rootScope.hideSpinner();
            toaster.pop('error', 'API error', msg, 0);
        };
    }]);

/**
 * API service
 */
main.factory("API", ["$http", "$rootScope", function ($http, $rootScope) {
    var emptyFun = function () { return null; };
    var service = {};

    /**
     * Get internal jobs
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.getInternalJobs = function (callback) {
        return $http({
            method: 'GET',
            url: '/api/jobs/internal'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Get reports data
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.getReports = function (callback) {
        return $http({
            method: 'GET',
            url: '/api/reports'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Get application settings
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.getSettings = function (callback) {
        return $http({
            method: 'GET',
            url: '/api/settings'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Start background service
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.startService = function (callback) {
        return $http({
            method: 'POST',
            url: '/api/settings/startService'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Stop background service
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.stopService = function (callback) {
        return $http({
            method: 'POST',
            url: '/api/settings/stopService'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Get status of background service
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.getStatus = function (callback) {
        return $http({
            method: 'GET',
            url: '/api/settings/status'
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Validate configuration
     * @param {Object} data the data to send
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.validate = function (data, callback) {
        return $http({
            method: 'POST',
            url: '/api/settings/validate',
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Save workflow configuration
     * @param {String} clientId the client id
     * @param {String} workflowId the workflow id
     * @param {Object} data the data to send
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.saveWorkflow = function (clientId, workflowId, data, callback) {
        return $http({
            method: 'POST',
            url: '/api/settings/saveWorkflow?clientId=' + clientId + "&workflowId=" + workflowId,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Search work unit documents
     * @param {Object} data the data to send
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.searchDocuments = function (data, callback) {
        return $http({
            method: 'POST',
            url: '/api/data/search',
            data: JSON.stringify(data)
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    /**
     * Update  work unit document
     * @param {Number} id the document id
     * @param {Object} data the data to send
     * @param {Function} callback the callback function after success
     * @returns {*} promise
     */
    service.saveDocument = function (id, data, callback) {
        return $http({
            method: 'POST',
            url: '/api/data/document/' + id,
            data: data
        }).success(callback || emptyFun).error($rootScope.handleHttpError);
    };

    return service;
}]);