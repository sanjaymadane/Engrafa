/*
 * Copyright (C) 2014 - 2015 TopCoder Inc., All Rights Reserved.
 */

/**
 * Contains the methods responsible for the autentication details
 *
 * @version 1.2
 * @author crimmc
 * 
 * Changes in 1.1:
 * 1. Add 'basic' passport (merge with apiServer)
 *
 * Changes in 1.2:
 * - Updated the configuration file path.
 */
"use strict";

var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;

var config = require('../../config');
var userService = require('./UserService');

var mongoose = config.getIntegrationManagerMongoose();
var ClientAPIConfiguration = mongoose.model('ClientAPIConfiguration',
    require('../models/ClientAPIConfiguration').ClientAPIConfigurationSchema);

function configure(app) {
    app.use(cookieParser());
    app.use(session({ secret: config.AUTHENTICATION_SESSION_SECRET }));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy({
        usernameField: "username",
        passwordField: "password"
    },
        function (username, password, done) {
            userService.checkPassword(username, password, function (err, isCorrectPassword, user) {
                if (err) { return done(err); }
                if (!user) {
                    return done(null, false);
                }
                if (!isCorrectPassword) {
                    return done(null, false, user);
                }
                return done(null, true, user);
            });
        }
        ));
    passport.serializeUser(function (user, done) {
        done(null, user.username);
    });

    passport.deserializeUser(function (id, done) {
        done(null, id);
    });

    // Setup HTTP Basic authentication, clientId as username, authenticationKey as password
    passport.use(new BasicStrategy(
        function (username, password, done) {
            ClientAPIConfiguration.findOne({ clientId: username, authenticationKey: password}, function (err, cac) {
                if (err) {
                    return done(err);
                }
                if (!cac) {
                    return done(null, false);
                }
                return done(null, cac);
            });
        }
    ));
}

function requiresAuthentication(req, res, next) {
    if (req.isAuthenticated() || process.env.IS_TEST) {
        next();
    } else {
        return next({ status: 500, message : 'Unable to verify identity.' });
    }
}

function requiresAdmin(req, res, next) {
    if (process.env.IS_TEST) {
        next();
        return;
    }
    userService.findByName(req.user, function (err, principal) {
        if (err) {
            return next(err);
        }

        if (!principal) {
            return next({ status: 500, message : 'Unable to verify identity.' });
        }

        if (!principal.isAdmin) {
            res.status(403).send("You're not authorized to perform this operation.");
        } else {
            next();
        }
    });
}

function authenticate(req, res, next) {
    return passport.authenticate('local', function (err, isValid, user) {
        if (err) { return next(err); }
        if (!isValid) {
            return res.status(403).json({
                message: "invalid username or password"
            });
            //return res.error()
        }
        // Manually establish the session...
        req.login(user, function (err) {
            if (err) {
                return next(err);
            }
            return res.json(user);
        });
    })(req, res, next);
}

//auth middleware for api clients
var authenticateApiClient = passport.authenticate('basic', { session: false });

function checkAuthentication(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.json(false);
    }

    userService.findByName(req.user, function (err, user) {
        if (err) {
            return next(err);
        }

        if (!user) {
            return next({ status: 500, message : 'Unable to verify identity.' });
        }

        return res.json(user);
    });
}

function logout(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    req.logout();
    res.json(true);
}


module.exports = {
    authenticate: authenticate,
    checkAuthentication: checkAuthentication,
    logout: logout,
    configure: configure,
    requiresAdmin: requiresAdmin,
    requiresAuthentication: requiresAuthentication,
    authenticateApiClient: authenticateApiClient
};