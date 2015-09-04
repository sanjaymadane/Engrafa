/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
package com.tlswe.awsmock.ec2.model;

import org.slf4j.Logger;

/**
 * This class is a custom MockEc2Instance which write status changes to log.
 * @author duxiaoyang
 * @version 1.0
 */
public class LoggingMockEc2Instance extends AbstractMockEc2Instance {

    /**
     * Represents the logger.
     */
    private final Logger log = org.slf4j.LoggerFactory.getLogger(LoggingMockEc2Instance.class);

    /**
     * Invoked when the instance is started.
     */
    @Override
    public void onStarted() {
        log.info("Instance " + getPubDns() + " is started.");
    }

    /**
     * Invoked when the instance is booted.
     */
    @Override
    public void onBooted() {
        log.info("Instance " + getPubDns() + " is booted.");
    }

    /**
     * Invoked when the instance is stopping.
     */
    @Override
    public void onStopping() {
        log.info("Instance " + getPubDns() + " is stopping.");
    }

    /**
     * Invoked when the instance is stopped.
     */
    @Override
    public void onStopped() {
        log.info("Instance " + getPubDns() + " is stopped.");
    }

    /**
     * Invoked when the instance is terminating.
     */
    @Override
    public void onTerminating() {
        log.info("Instance " + getPubDns() + " is terminating.");
    }

    /**
     * Invoked when the instance is terminated.
     */
    @Override
    public void onTerminated() {
        log.info("Instance " + getPubDns() + " is terminated.");
    }

    /**
     * Invoked when the internal timer is changed.
     */
    @Override
    public void onInternalTimer() {
        // do nothing by default
    }
}
