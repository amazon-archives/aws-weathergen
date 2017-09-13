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

var _ = require('lodash')
var log = require('./log')
var AWS = require('aws-sdk')
var https = require('https')
var config = require('../../config/config')
var StreamBuffer = require('./streamBuffer')
/**
 * A Cloud Watch singleton instance
 * 
 */
/**
 * (description)
 */
var cloudWatchSingleton = function cloudWatchSingleton () {
  // var _loggingName = 'cloudwatchlogger'
  // var _awsEndPoint = undefined
  // var _ready = false
  // var _cloudWatchLogs = undefined
  // var _loggingGroup = undefined
  // this._retryInterval = config.cloudWatchLogs.retryInterval
  // var _streamBuffers = []

  /**
   * initialises the singleton making it ready for use
   * 
   * @callback cb method/function called on completion 
   */
  // this.init = function (cb) {
  //   var self = this

  //   log.info({name: _loggingName,msg: 'Initialising Cloud Watch Logging'})
  //   this._awsEndPoint = 'logs.' + config.cloudWatchLogs.region + '.amazonaws.com'

  //   var defaultStream = new StreamBuffer(config.cloudWatchLogs.defaultStream, function (logMessages) {
  //     self._processLogMessage(logMessages)
  //   })

  //   self._addStreamBuffer(defaultStream)
  //   defaultStream.isPassive(false)

  //   this._checkEndPoint(this._awsEndPoint, function (res) {
  //     if (!res) {
  //       log.error({name: _loggingName,msg: 'Cannot reach CloudWatch'})
  //       cb(false)
  //     }
  //     log.info({name: _loggingName,msg: 'CloudWatch endpoint ready'})
  //     self._cloudWatchLogs = new AWS.CloudWatchLogs({region: config.cloudWatchLogs.region})
  //     cb(true)
  //   })
  // }

  this.setDefaultStreamLoggingGroup = function (name) {
    var stream = this._findStreamBuffer(config.cloudWatchLogs.defaultStream)
    stream.setLoggingGroupName = name
  }

  this._processLogMessage = function (logMessages) {
    var self = this

    logMessages.group = this._loggingGroup

    if (logMessages.group == undefined || logMessages.messages.length == 0) {
      return false
    }

    var params = {
      logEvents: logMessages.messages,
      logStreamName: logMessages.stream,
      logGroupName: logMessages.group
    }

    var stream = self._findStreamBuffer(params.logStreamName)

    var sequenceToken = stream.getSequenceToken()

    if (sequenceToken) {
      params.sequenceToken = sequenceToken
    }

    this._cloudWatchLogs.putLogEvents(params, function (err, data) {
      if (err) {
        console.log(err)
        return undefined
      } else {
        if (data.nextSequenceToken) {
          stream.setSequenceToken(data.nextSequenceToken)
          stream.empty()
        }
      }
    })
  }

  /**
   * write log informational message to CloudWatch
   * 
   * @param msg msg to wrtite
   */
  this.info = function (msg) {
    this._addMsgToStreamBuffer(msg)
  }

  /**
    * write log warning message to CloudWatch
    * 
    * @param msg msg to wrtite
    */
  this.warn = function (msg) {
    // console.log('log warn to cloudwatch')
  }

  /**
    * write log error message to CloudWatch
    * 
    * @param msg msg to wrtite
    */
  this.error = function (msg) {
    // console.log('log error to cloudwatch')
  }

  /**
   * Check if Cloud Watch is ready to recieve logs
   * 
   * @param val (true|false) set _ready
   * @returns true if Cloud Watch is ready
   */
  this.isReady = function (val) {
    if (val != undefined) {
      this._ready = val
    } else {
      return this._ready
    }
  }

  /**
   * Waits for Cloud Watch to become ready
   * 
   * @callback cb method/function called on completion 
   */
  this.wait = function (cb) {
    var self = this

    if (this._ready) {
      var retryCounter = 1
      log.warn({name: this._loggingName, msg: 'Waiting for CloudWatch - Retrying every ' + this._retryInterval / 1000 + 'sec'})
      retryCounter++

      /**
       * keep trying until _ready
       */
      var interval = setInterval(function () {
        if (!self._ready) {
          log.info({name: self._loggingName, msg: 'CloudWatch logging ready'})
          clearInterval(interval)
          cb()
        } else {
          log.warn({name: self._loggingName, msg: 'Waiting for CloudWatch - Retrying'})
          retryCounter++
        }
      }, this._retryInterval)
    } else {
      self.setDefaultStreamLoggingGroup(self._loggingName)

      cb()
    }
  }

  this.createLoggingGroup = function (groupName, cb) {
    var self = this
    var err = undefined

    if (groupName == '' || !_.isString(groupName)) {
      log.error({name: self._loggingName, msg: 'Invalid, malfomed or missing group name'})
      cb(true)
    }

    log.info({name: self._loggingName, msg: 'Creating CloudWatch Logging group ' + groupName })

    this._hasCloudWatchLogGroup(groupName, function (res) {
      if (res) {
        log.warn({name: self._loggingName, msg: 'CloudWatch Logging group ' + groupName + ' already exists'})
        self._loggingGroup = groupName
        err = false
      } else {
        self._cloudWatchLogs.createLogGroup({ logGroupName: groupName }, function (err, data) {
          if (err) {
            log.error({name: self._loggingName, msg: 'Could not create CloudWatch Logging group' + groupName + '[' + err.message + ']'})
            err = true
          } else {
            log.info({name: self._loggingName, msg: 'CloudWatch Logging group ' + groupName + ' created' })
            self._loggingGroup = groupName
            self.createLoggingStream(self._loggingGroup, config.cloudWatchLogs.defaultStream, function (err) {})
            err = false
          }
        })
      }
      cb(err, self._loggingGroup)
    })
  }

  this.createLoggingStream = function (groupName, streamName, cb) {
    var self = this
    var err = undefined

    if (groupName == '' || !_.isString(groupName)) {
      log.error({name: self._loggingName, msg: 'Invalid, malfomed or missing group name'})
      cb(true)
    }

    if (streamName == '' || !_.isString(streamName)) {
      log.error({name: self._loggingName, msg: 'Invalid, malfomed or missing stream name'})
      cb(true)
    }

    var params = {
      logGroupName: groupName,
      logStreamName: streamName
    }

    this._cloudWatchLogs.createLogStream(params, function (err, data) {
      if (err) {
        if (err.code === 'ResourceAlreadyExistsException') {
          log.warn({ name: self._loggingName, msg: err.message })
          cb(false)
        } else {
          log.error({name: self._loggingName, msg: err.message})
          process.exit(1)
        }
      } else {
        // successful response
        log.info({name: self._loggingName,msg: 'CloudWatchLogStream ' + streamName + ' created'})

        var streamBuffer = self._findStreamBuffer(streamName)
        if (!streamBuffer) {
          var streamBuffer = new StreamBuffer(streamName, function (logMessages) {
            self._processLogMessage(logMessages)
          })
          self._addStreamBuffer(streamBuffer)
          streamBuffer.setLoggingGroupName(groupName)
          streamBuffer.isPassive(false)
        } else {
          streamBuffer._logGroupName = groupName
          streamBuffer.isPassive(false)
        }

        log.info({name: self._loggingName, msg: 'Creating CloudWatch Logging stream ' + streamName })
        cb(false)
      }
    })
  }

  /*************************************************************************
  PRIVATE METHODS
  *************************************************************************/

  this._addMsgToStreamBuffer = function (msg) {
    var self = this
    var sb = this._findStreamBuffer(msg.name)

    if (sb) {
      sb.addMsg(JSON.stringify(msg))
    } else {
      // console.log('e')
    }
  }

  /**
   * Ensure the cloud watch endpoint is available
   * 
   * @param endPoint URL of the endpoint to check
   * @callback cb method/function called on completion 
   */
  this._checkEndPoint = function (endPoint, cb) {
    log.info({name: _loggingName,msg: 'Checking end point: ' + endPoint})

    var options = {
      host: endPoint,
      method: 'GET'
    }

    /**
     * request from a url
     * 
     * @param res (description)
     */
    var req = https.request(options, function (res) {
      res.statusCode == 403 ? cb(true) : cb(false)
    })
    req.end()
  }

  /**
    * check if a cloudwatch group exists
    * 
    * @param res group name to check for existance
    * @callback cb method/function called on completion 
    */
  this._hasCloudWatchLogGroup = function (groupName, cb) {
    var self = this

    var params = {
      limit: 10,
      logGroupNamePrefix: groupName
    }

    self._cloudWatchLogs.describeLogGroups(params, function (err, data) {
      if (err) {
        log.error({name: self._loggingName, msg: err.message })
        process.exit(1)
      } else {
        data.logGroups.length === 0 ? cb(false) : cb(true)
      }
    })
  }

  /**
     * add a stream buffer
     * 
     * @param streamBuffer StreamBuffer buffer to add 
     */
  this._addStreamBuffer = function (streamBuffer) {
    var index = _streamBuffers.push(streamBuffer)
    streamBuffer.start()
  }

  this._findStreamBuffer = function (streamBufferName) {
    var self = this
    var streamBufferResult = undefined

    streamBufferResult = _.find(_streamBuffers, function (streamBuffer) {
      return streamBuffer.getName() == streamBufferName
    })
    return streamBufferResult
  }
}

/*************************************************************************
SINGLETON CLASS DEFINITION
*************************************************************************/
cloudWatchSingleton.instance = null

/**
 * Singleton getInstance definition
 * @return singleton class
 */
cloudWatchSingleton.getInstance = function () {
  if (this.instance === null) {
    this.instance = new cloudWatchSingleton()
  }
  return this.instance
}

module.exports = cloudWatchSingleton.getInstance()
