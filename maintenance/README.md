Maintenance
================

The Periodic Maintenance module.

## Setup

1. Start in the maintenance directory:

  ```
  cd maintenance
  ```
1. Install the dependencies:

  ```
  npm install -g forever
  npm install
  ```
2. The module depends on WorkflowManager and Integration Manager modules. It needs to properly setup them at first.

## Configuration
1. In S3, create engrafatest Bucket.
    Open aws.amazon.com, login with your username and password.
    In Services menu, select S3, create engrafatest Bucket.

2. In S3, create a user, grant write permission of S3, get access key and access secret.
    In menu of top right side, click the "Security Credential".
    Click Users menu, add engrafa_test user. Get the access key id and access secret key in created page.
    Click Groups menu, add S3_backup group with AmazonS3FullAccess permission.
    Move the engrafa_test user to S3_backup group.
    To see the access secret key again, select the just created IAM user, select User Actions -> Manage Access Keys to create new access key. Please refer to http://www.cloudberrylab.com/blog/how-to-find-your-aws-access-key-id-and-secret-access-key-and-register-with-cloudberry-s3-explorer/ for more detail.

3. Update config/config.js.

## Start
The current Maintenance.js could run in following way:
1. Run in CORN type:
    node Maintenance.js
2. Stop instance:
    node Maintenance.js stopInstances
3. Delete logs:
    node Maintenance.js deleteLogs
4. Start instances:
    node Maintenance.js startInstances
5. Dump database:
    node Maintenance.js dumpDatabases [prefix]
6. Upload files:
    node Maintenance.js uploadFiles [prefix]

## Deployment Guide
See `docs/DeploymentGuide.doc` for more details.
