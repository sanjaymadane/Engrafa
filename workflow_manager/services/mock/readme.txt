//******************************************************
//	Crowd Flower Mock API Restful API
//	Written by: Marcos Garcia
//	Email: marcosdevelopment@gmail.com
//******************************************************

Description:
This is a mock API for the crowdflower.com API.  It uses mongodb to create, read, and delete jobs and units.  This allows it to have a persistent layer that will link jobs to units. The goal here was to replicate the cf API as best as I could so that one could easily make changes to adapt to any cf API changes and at the same time possibly build on this to do more with the related data.  I tried to make it as smart and as accurate as I could to the real thing.

INDEX:
	I.    Available APIs and functionality
	II.   File Details
	III.  SETUP AND RUN
	IV.   Submission Videos
	V.    Comments


I.  Available APIs and functionality
--------------------------------------------------------
GET    /account.json
GET    /jobs/:jobId.json
GET    /jobs/:jobId/ping.json
POST   /jobs.json
GET    /jobs.json?page=:pageId
POST   /jobs/:jobId/channels (handled but doesn't return anything)
POST   /jobs/:jobId/units.json?unit[data][url]=:workUnitUrl
GET    /jobs/:jobId/units/:unitId
DEL    /jobs/:jobId
PUT    /jobs/:jobId/units/:unitId/cancel.json

Limit Throttle:
in mockCrowdFlowerAPI.js change the restify.throttle parameters for burst and ip.
	Example:
		server.use(restify.throttle({
		  burst: 1,
		  rate: 1,
		  ip: true
		}));

II. File Details
--------------------------------------------------------
Root Folder
	mockCrowdFlowerAPI.js - This is the launch server file that uses restify to read and execute API Calls
	package.json - This is a node.js file that tells the node package manager which dependencies to create at node_modules
	readme.txt - You're looking at it.
	modules\
		MockAPI.js - This file handles creating, reading, and saving of the data


III. SETUP AND RUN
--------------------------------------------------------
Requirements;
	node.js
	mongodb

Install and run instructions:
	1)  Go to the root folder and run "node npm install" (you may need to use sudo to install mongojs due to BSON being difficult)
		This will install the restify and mongojs modules

	2)  If your mongodb database requires credentials you
		can populate them inside /modules/MockAPI.js

		example:
		Change the uri variable: 
			from mongodb://localhost:27017/engrafa-crowdflower-mock
			to: mongodb://username:password@localhost:27017/engrafa-crowdflower-mock

	3)	run: node mockCrowdFlowerAPI.js to start the API server

	4)  Go to your workflow_manager/config/config.js file and change your CROWDFLOWER_API_BASE_URL to "http://localhost:3000"

	You can now follow the workflow_manager documentation to create Jobs that persist via this mockAPI
	Once jobs are created you can drop in your box.com files like normal to create units that come back as status "finalized"

IV. Submission Videos
--------------------------------------------------------
The video link below explains the install setup process and the actual work flow of it all working together.
https://www.youtube.com/watch?v=Iu4rP1vaN90

The video link below gives a quick over view of the mockCrowdFlowerAPI.js and it's module MockAPI.js.
https://www.youtube.com/watch?v=m9gcKIQTOQc

Please email me and let me know if you'd like the videos taken down after viewing them.

V. Comments
--------------------------------------------------------
My API relies on jobs not already existing.  It doesn't handle jobIds that don't exist in the engrafa-crowdflower-mock mongo database. Only ones freshly created by create-jobs.js while this API is running. This could easily be fixed though by making mongo save any "job" that didn't exist in the database as a new job.  I coded this however with the assumption that one would be freshly creating jobs via create-jobs.js.

Also, the included workflow_manager.zip file you guys supplied wasn't plug and play. I had to tweak a few files inorder for them to line up.
test_files/config.js listed a bunch of jobs but only 3 are created by the default create-jobs.js.  Insert.js didn't match the created jobs either.
ClientB had more jobs than are being created by create-jobs.js.  The setup documentation didn't explain what to do with "internal-jobs.json".  After figuring these things out and tweaking correctly I was able to get it all up and running.  I'm not complaining just thought I'd let you know incase you bump into the same issues testing this API. :P

Thanks,
Marcos