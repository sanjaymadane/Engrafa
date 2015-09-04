#!/bin/bash

./node_modules/.bin/jslint -node -nomen -unparam -vars -stupid -plusplus -newcap \
workflow_manager/config/**/*.js \
workflow_manager/controllers/**/*.js \
workflow_manager/helpers/**/logging.js \
workflow_manager/helpers/**/validator.js \
workflow_manager/models/**/*.js \
workflow_manager/services/**/*.js \
workflow_manager/test_files/**/*.js \
workflow_manager/EngrafaServiceApp.js \
workflow_manager/server.js \
workflow_manager/angular/js/**/**.js \
middleware_service/controllers/WebhookController.js \
middleware_service/helpers/DelegateFactory.js \
middleware_service/services/BoxService.js \
middleware_service/app.js \
integration_manager/angular/js/**/directives.js \
integration_manager/Gruntfile.js \
integration_manager/controllers/**/*.js \
integration_manager/helpers/**/*.js \
integration_manager/models/**/*.js \
integration_manager/services/**/*.js \
integration_manager/test/**/*.js \
integration_manager/test_files/**/*.js
