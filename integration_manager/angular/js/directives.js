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
/*global angular */
angular.module('engrafa.directives', []).
    directive('activeLink', ['$location', function (location) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
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
    }])  // For anchor tag disabled
    .directive('anchorDisabled', function () {
        return {
            compile: function (tElement, tAttrs) {
                //Disable ngClick
                tAttrs.ngClick = "!(" + tAttrs.anchorDisabled + ") && (" + tAttrs.ngClick + ")";

                //return a link function
                return function (scope, iElement, iAttrs) {

                    //Toggle "disabled" to class when aDisabled becomes true
                    scope.$watch(iAttrs.anchorDisabled, function (newValue) {
                        if (newValue !== undefined) {
                            iElement.toggleClass("disabled", newValue);
                        }
                    });

                    //Disable href on click
                    iElement.on("click", function (e) {
                        if (scope.$eval(iAttrs.anchorDisabled)) {
                            e.preventDefault();
                        }
                    });
                };
            }
        };
    })
    .directive('bootstrapTooltip', function () {
        return {
            link: function (scope, element, attrs) {
                scope.$watch(function () {
                    return attrs.title;
                }, function () {
                    if (attrs.title && attrs.title.length > 0) {
                        element.tooltip({
                            title: attrs.title
                        })
                    };
                });
            }
        }
    });
