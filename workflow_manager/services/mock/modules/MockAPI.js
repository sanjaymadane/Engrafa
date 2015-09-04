'use strict';
//******************************************************
//    Crowd Flower Mock API Restful API - MockAPI.js
//    Written by: Marcos Garcia
//    Email: marcosdevelopment@gmail.com
//******************************************************
var mongojs = require("mongojs"),
    uri = "mongodb://localhost:27017/engrafa-crowdflower-mock",
    db = mongojs.connect(uri, ["mock_jobs", "mock_units"]);

module.exports = {
    getAccount: function (cb) {
        var account = {
            "id": 47405,
            "email": "mock@fake.com",
            "active": true,
            "auth_code": null,
            "first_name": "Ralph",
            "last_name": null,
            "auth_key": "YwVPZ64zVv55EnL1Cepj",
            "job_type": "unknown",
            "akon_id": "63d0786b-46fd-4988-b9ba-a1b823a7120e",
            "status": "normal",
            "order_approved": true,
            "created_at": "2013-08-09T00:30:44+00:00",
            "project_number": null,
            "balance": 63.99,
            "plan_name": "basic"
        };

        cb(account);
    },
    getJobDetails: function (jobId, cb) {
        db.mock_jobs.find({"id": parseInt(jobId, 10)}, function (err, jobs) {
            cb(jobs[0]);
        });

    },
    getJobPingDetails: function (jobId, cb) {
        //get all units from mongodb
        db.mock_units.find({"job_id": parseInt(jobId, 10)},  function (err, units) {
            var response = {"golden_units": 0,
                            "all_units": parseInt(units.length, 10),
                            "ordered_units": parseInt(units.length, 10),
                            "completed_units_estimate": 0,
                            "needed_judgments": 0,
                            "all_judgments": 0,
                            "tainted_judgments": 0,
                            "completed_gold_estimate": 0,
                            "completed_non_gold_estimate": 0};
            cb(response);
        });

    },
    getJobs: function (page, cb) {
        var limit = 10;

        //pull 10 jobs at a time based on page
        db.mock_jobs.find({}, {limit: limit, skip: (page - 1) * limit}, function (err, jobs) {
            cb(jobs);
        });

    },
    createJobDocument: function (job, cb) {
        var date = new Date();
        var components = [
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        ];

        var id = components.join(""); //join components to create a uniqueid

        var response = {"id": parseInt(id, 10),
                        "options": {"logical_aggregation": true, "track_clones": true, "mail_to": "mock@fake.com", "req_ttl_in_seconds": 1800, "front_load": false, "after_gold": 10},
                        "title": job.title,
                        "secret": "jMbtyANzMGKGCV8eBEuKs/rqZy/4EQg/nErEjUbVMIGA",
                        "project_number": null,
                        "alias": null,
                        "judgments_per_unit": parseInt(job.judgments_per_unit, 10),
                        "units_per_assignment": parseInt(job.units_per_assignment, 10),
                        "pages_per_assignment": 1,
                        "max_judgments_per_worker": parseInt(job.max_judgments_per_worker, 10),
                        "max_judgments_per_ip": parseInt(job.max_judgments_per_ip, 10),
                        "gold_per_assignment": 0,
                        "minimum_account_age_seconds": null,
                        "execution_mode": "worker_ui_remix",
                        "payment_cents": 10,
                        "design_verified": true,
                        "require_worker_login": true,
                        "public_data": false,
                        "variable_judgments_mode": "none",
                        "max_judgments_per_unit": null,
                        "expected_judgments_per_unit": null,
                        "min_unit_confidence": null,
                        "units_remain_finalized": null,
                        "auto_order_timeout": null,
                        "auto_order_threshold": 1,
                        "completed_at": null,
                        "state": "unordered",
                        "auto_order": job.auto_order,
                        "webhook_uri": null,
                        "send_judgments_webhook": null,
                        "language": "en",
                        "minimum_requirements": {"priority": 1, "skill_scores": {"level_1_contributors": 1}, "min_score": 1},
                        "desired_requirements": null,
                        "order_approved": false,
                        "max_work_per_network": null,
                        "copied_from": null,
                        "created_at": "2015-02-25T06:18:00+00:00",
                        "updated_at": "2015-02-25T06:18:04+00:00",
                        "included_countries": [],
                        "excluded_countries": [],
                        "instructions": "",
                        "cml": job.cml
                    };

        db.mock_jobs.insert(response, {}, function (err, record) {
            cb(response);
        });


    },
    deleteJob: function (jobId, cb) {
        db.mock_jobs.remove({"id" : parseInt(jobId, 10)},  function (err, units) {
            cb({});    //cf API is always returning an empty object
        });
    },
    createUnit: function (jobId, query, cb) {
        var dataUrl = "";

        var date = new Date();
        var components = [
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        ];

        var unitId = components.join(""); //join components to create a uniqueid

        if (query["unit[data][url]"]) {
            dataUrl = query["unit[data][url]"];
        }

        var response = {
            "id": parseInt(unitId, 10),
            "data": {"url": dataUrl},
            "difficulty": 0,
            "judgments_count": 0,
            "state": "finalized",
            "agreement": null,
            "missed_count": 0,
            "gold_pool": null,
            "created_at": "2015-02-26T04:06:18+00:00",
            "updated_at": "2015-02-26T04:06:18+00:00",
            "job_id": parseInt(jobId, 10),
            "results": {
                "judgments": [],
                "validstate": {"agg": null, "confidence": null},
                "state": {"agg": null, "confidence": null}
            }
        };

        db.mock_units.insert(response, {}, function (err, record) {
            if (err) {
                console.log('MockAPI.createUnit Error: ' + err);
            }

            response.message = {"notice": "Unit was successfully created"};
            cb(response);
        });

    },
    getUnit: function (jobId, unitId, cb) {
        db.mock_units.find({"id" : parseInt(unitId, 10), "job_id" : parseInt(jobId, 10)}, {limit: 1},  function (err, units) {
            cb(units[0]);
        });
    }

};
