/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 */
/**
 * Generate access token and refresh token for box.com
 *
 * @version 1.1
 * @author Sky_
 * changes in 1.1:
 * 1. update with express 4.
 */
"use strict";


var express = require('express');
var OAuth2Strategy = require('passport-oauth2');
var passport = require("passport");
var http = require("http");
var bodyParser = require('body-parser');
var session = require('express-session');
var morgan = require('morgan');

var config = require("../../../config");

passport.use(new OAuth2Strategy({
    clientID: config.BOX_API_CLIENT_ID,
    clientSecret: config.BOX_API_CLIENT_SECRET,
    authorizationURL: "https://www.box.com/api/oauth2/authorize",
    tokenURL: "https://www.box.com/api/oauth2/token",
    callbackURL: "http://localhost:3000/callback"
}, function (accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.accessTokenSecret = refreshToken;
    done(null, {accessToken: accessToken, refreshToken: refreshToken});
}
    ));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

var app = express();

app.set('port', 3000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


app.get('/', passport.authenticate('oauth2'));
app.get('/callback',
    passport.authenticate('oauth2'),
    function (req, res, next) {
        res.json(req.user);
    });

//start the app
http.createServer(app).listen(app.get('port'), function () {
    console.info('Express server listening on port ' + app.get('port'));
});