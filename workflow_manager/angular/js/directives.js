/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */

'use strict';

/**
 * Represents Directives for angular
 *
 * @author Sky_
 * @version 1.0
 */
/*global angular, _, $ */

angular.module('engrafa.directives', []).
    directive('activeLink', ['$location', function (location) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs, controller) {
                var clazz = attrs.activeLink;
                var path = element.find('a').attr('href');
                path = path.substring(1); //hack because path does not return including hashbang
                scope.location = location;
                scope.$watch('location.path()', function (newPath) {
                    if (path === newPath) {
                        element.addClass(clazz);
                    } else {
                        element.removeClass(clazz);
                    }
                });
            }
        };
    }]);
