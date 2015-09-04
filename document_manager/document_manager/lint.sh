#!/bin/bash

## JSLint
## `npm install -g jslint`
##
## Assume - Node.js
## Tolerate - dangling _ in identifiers, unused parameters,
##            many var statements, -Sync, ++, initial lower cap for constructor
jslint -node -nomen -unparam -vars -stupid -plusplus \
controllers/**/*.js \
models/**/*.js \
services/**/*.js \
test_files/**/*.js \
*.js