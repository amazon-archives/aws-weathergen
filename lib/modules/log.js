/*
 * Copyright 2015-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
'use strict'

var bunyan = require('bunyan')
var bformat = require('bunyan-format')
var formatOut = bformat({ outputMode: 'long' })
var _ = require('lodash')
var config = require('../../config/config.js')

var logSingleton = function logSingleton () {
  this._bunyan = undefined
  this._destination = ['local']
  this._defaultLevel = 'info'
  this._loggingName = 'weather'
  this._fileName = module.filename.slice(__dirname.length + 1, -3).toUpperCase()
  this._hasLocalDestination = false
  this._hasCloudWatchDestination = false
  this._cloudWatchLogger = undefined
  this.cloudWatchLoggingGroup = undefined

  this.init = function (params) {
    var self = this

    if (params != undefined) {
      this._destination = params.destination || this._destination
      this._defaultLevel = params.defaultLevel || this._defaultLevel
      this._loggingName = params.loggingName || this._loggingName
    }

    this._destination.find(function (destination) {
      if (destination == 'local') {
        self._bunyan = bunyan.createLogger({ name: self._loggingName, stream: formatOut })
        self._bunyan.info('Initialising local logging')
        self._hasLocalDestination = true
      }
    })
  }

  this.info = function (msg) {
    var logObj = this._validateLogMsg(msg)

    if (this._hasLocalDestination) {
      this._bunyan.info({name: logObj.name}, logObj.message)
    }
  }

  this.error = function (msg) {
    var logObj = this._validateLogMsg(msg)

    if (this._hasLocalDestination) {
      this._bunyan.error({name: logObj.name}, logObj.message)
    }

    if (this._hasCloudWatchDestination) {
      this._cloudWatchLogger.error(logObj)
    }
  }

  this.warn = function (msg) {
    var logObj = this._validateLogMsg(msg)

    if (this._hasLocalDestination) {
      this._bunyan.warn({name: logObj.name}, logObj.message)
    }

    if (this._hasCloudWatchDestination) {
      this._cloudWatchLogger.warn(logObj)
    }
  }

  /*************************************************************************
   PRIVATE METHODS
   *************************************************************************/

  this._validateLogMsg = function (msg) {
    var logObject = {}

    if (_.isObject(msg)) {
      if (msg.msg == undefined) {
        throw new Error('Log object must contain message')
      } else {
        logObject.message = msg.msg
      }

      if (msg.name == undefined) {
        logObject.name = this._loggingName
      } else {
        logObject.name = msg.name
      }
    }

    if (_.isString(msg)) {
      logObject.msg = msg
      logObject.name = this._loggingName
    }

    if (msg.timestamp == undefined) {
      logObject.timestamp = new Date().getTime()
    }

    return logObject
  }
}

/*************************************************************************
SINGLETON CLASS DEFINITION
************************************************************************ */
logSingleton.instance = null

/**
 * Singleton getInstance definition
 * @return singleton class
 */
logSingleton.getInstance = function () {
  if (this.instance === null) {
    this.instance = new logSingleton()
  }
  return this.instance
}

module.exports = logSingleton.getInstance()
