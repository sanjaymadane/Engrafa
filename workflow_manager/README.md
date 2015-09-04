Workflow Manager
================

Workflow Manager acts as a traffic cop to automate sending PDFs through segmented jobs and aggregating the results into a complete data set.  Workflow Manager monitors client files in online storage and spins up crowdsourcing work units to capture metadata and data within the documents.

The Workflow Manager service does the following:

1. Polls Box for new documents and creates related Work Units.
1. Processes each Work Unit through a series of phases: Classification, Taxonomy, Extraction, Review, and Escalation.
1. Manages multiple workflows for multiple clients, each configured to carry out various CrowdFlower tasks per phase to collect data.
1. Aggregates the results of each workflow per Work Unit and generates related output XML back on Box.

## Setup

1. Start in the Workflow Manager directory:

  ```
  cd workflow_manager
  ```
1. Install the dependencies:

  ```
  npm install
  bower install
  ```
1. Copy example files to your own files:

  ```
  cp config/config.example.js config/config.js
  cp config/internal-jobs.example.json config/internal-jobs.json
  cp config/users.example.htpasswd config/users.htpasswd
  cp test_files/config.example.js test_files/config.js
  cp test_files/insert.example.js test_files/insert.js
  ```
1. **Set Up Box**
  1. **Set Up Content App**
    1. Go to http://developers.box.com/ to sign up for a free Box developer account.
    1. Create a **Box Content** Box Application, e.g. `engrafa-content`. (You can name it whatever you want.)
    1. Configure/Edit your application to set the `redirect_uri` to [http://localhost:3000/callback](http://localhost:3000/callback).
    1. Note your app's `client_id` and `client_secret`, and copy them to the configuration file:
    
       ```JavaScript
       // config/config.js
       BOX_API_CLIENT_ID : 'ofx9xlc0n98dkcxlym7fj47150mu0pn5',
       BOX_API_CLIENT_SECRET : '44aO9YGC19TG4Sone81sI3Zn4T7xn7ce',
       ```
    1. After you save the application, run our OAuth script to get Refresh and Access tokens:
      
      ```
      node test_files/box-oauth/app.js
      ```
    1. Open [http://localhost:3000](http://localhost:3000).  Login to Box with your account and grant permissions.
    1. Copy the `accessToken` and `refreshToken` to the configuration file:
    
      ```JavaScript
      // config/config.js
      BOX_ACCESS_TOKEN : 'ojZSjwo9Fzg3jy6RthPYXu8VNAteovBl',
      BOX_REFRESH_TOKEN : 'IjtyeqWtvnYBi4Z5nuv24Zy4g0qUnOSviu1L0k2yVZQ5D2EbaLpE36zfQ6n113M4',
      ```
  1. **Set Up Folders**
    1. Open https://box.com and create at least 3 folders: input, output, and public.  They can be in a hierarchy, e.g.
      - `clientA`
        - `standard`
          - **`input`**
          - **`output`**
      - **`public`**
    1. Copy the ID of the `public` folder from its URL to the app configuration.  E.g. https://app.box.com/files/0/f/2997615873/public:
      
      ```JavaScript
      // config/config.js
      BOX_PUBLIC_FOLDER_ID : '2997615873',
      ```
    1. Copy the IDs of the `input` and `output` folders to the **test config** file:
    
      ```JavaScript
      // test_files/config.js
      CLIENT_A: {
        STANDARD_INPUT: 2295708753,
        STANDARD_OUTPUT: 2295709089,
      }
      ```
1. **Set Up CrowdFlower**
  1. **Setup Trial Account**
    1. Go to http://www.crowdflower.com/ and click Sign Up to create a free Trial Account.
      1. For Gmail users, follow Deployment Guide, section 2.3: CrowdFlower.
    1. Open https://make.crowdflower.com/account/user and copy your API key for the configuration:
    
      ```JavaScript
      // config/config.js
      CROWDFLOWER_API_KEY : 'YwVPZ64zVv55EnL1Cepj',
      ```
  1. **Setup CrowdFlower Jobs**
    1. Run our setup script to generate some example jobs:
    
      ```
      node test_files/cf_helpers/create-jobs.js
      ```
    1. Use the output to update the `JOBS` constant in `test_files/config.js`:
    
      ```JavaScript
      // test_files/config.js
      "JOBS": {
        "CLASSIFICATION_STATE_BASIC": 728658,
        "TAXONOMY_ACCOUNT_NUMBER_BASIC": 728656,
        "EXTRACTION_ACCOUNT_NUMBER_BASIC": 728657
      },
      ```
    1. *(To delete all CrowdFlower jobs, run `test_files/cf_helpers/remove-all.js`.  You may need to run it multiple times.)*

## Running Workflow Manager

1. Start in the Workflow Manager directory:

  ```
  cd workflow_manager
  ```
1. Assuming all above configurations are set properly, you may populate your database with client and workflow configurations:

  ```
  node test_files/insert.js
  ```
  With the starter code, this creates a single client (Client A), with a single workflow (Standard), with 1 CrowdFlower task per main phase: Classification, Taxonomy, and Extraction.

  *If you change any Jobs, folders, or workflow details, you must re-run `insert.js` to update the DB.*
1. Start the application

  ```
  node EngrafaServiceApp.js
  ```
  *If you get errors about invalid Box.com access token / refresh token, then you may need to get the BOX_ACCESS_TOKEN and BOX_REFRESH_TOKEN values again as they may have expired. Once you start the application successfully, the application will take care of the updating the tokens automatically.*
1. You may now **upload files to your Box `input` folder** to process.

1. To work on tasks in each phase:
  1. Navigate to your [Jobs](https://make.crowdflower.com/jobs) page.
  1. To complete a job, click into a job with more rows than judgements (e.g. 3 Rows, 0 Judgements).  Look for the "Job link for your internal team" at the bottom of the Job Detail page for the internal work URL.  Clicking this, you can complete any open CrowdFlower tasks.
  1. Optionally, set `LOG_LINKS_OF_CREATED_JOBS` to `true` in `config/config.js` to automatically open the task in your browser window upon creation.
  1. **NOTE:** You must stay on a question for AT LEAST **10 seconds**, otherwise your user will be blocked from completing any more judgements for the current job.  If you run into this, you'll have to start over with the CrowdFlower jobs.

1. After completing all Classification jobs, the document will advance to Taxonomy and Extraction phases.
1. After completing all jobs, you will see a related XML file uploaded to your **Box `output` folder**.

## Admin UI
Workflow Manager has an Admin UI for updating some of the above values and running reports.  It assumes the same setup and configuration as before.  Once all set up, you can start up the related web server.

1. Start in the Workflow Manager directory:

  ```
  cd workflow_manager
  ```
1. Start the web server:

  ```
  node server.js
  ```
1. Go to the site: [http://localhost:3500](http://localhost:3500).
1. Sample login is admin/password.

## Deployment Guide
See `docs/DeploymentGuide.doc` for more details.
