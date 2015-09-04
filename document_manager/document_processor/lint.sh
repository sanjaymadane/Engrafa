#!/bin/bash

## JSLint
## `npm install -g jslint`
##
## Assume - Node.js
## Tolerate - dangling _ in identifiers, unused parameters,
##            many var statements, -Sync, ++
jslint -node -nomen -unparam -vars -stupid -plusplus \
controllers/**/*.js \
services/**/*.js \
*.js
