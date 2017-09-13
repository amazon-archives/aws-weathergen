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

var log = require('./log')
var config = require('../../config/config')
var cBuffer = require('./cbuffer')

var StreamBuffer = function (name, cb) {
  var self = this

  if (cb == undefined) {
    throw new Error('no stream buffer callback')
    process.exit(1)
  }

  this._name = name
  this._interval = false
  this._isPassive = true
  this._buffer = new cBuffer(config.cloudWatchLogs.streamBufferLength)
  this._streamBufferTimeout = config.cloudWatchLogs.streamBufferTimeout
  this._callback = cb
  this._sequenceToken = undefined
  this._logGroupName = undefined

  this._buffer.overflow = function (msg) {
    self._flushBuffer()
  }
}

StreamBuffer.prototype.addMsg = function (msg) {
  return this._buffer.push(JSON.parse(msg))
}

StreamBuffer.prototype.setLoggingGroupName = function (logGroupName) {
  this._logGroupName = logGroupName
}

StreamBuffer.prototype.getLoggingGroupName = function () {
  return this._logGroupName
}

StreamBuffer.prototype.setSequenceToken = function (token) {
  this._sequenceToken = token
}

StreamBuffer.prototype.start = function () {
  var self = this
  if (!this._isRunning) {
    this._interval = setInterval(function (self) {
      self._process()
    }, this._streamBufferTimeout, self)
  }
}

StreamBuffer.prototype.stop = function () {
  clearInterval(this._interval)
}

StreamBuffer.prototype.isRunning = function () {
  if (this._interval)
    return true
  else
    return false
}

StreamBuffer.prototype.getName = function () {
  return this._name
}

StreamBuffer.prototype.getSequenceToken = function () {
  return this._sequenceToken
}

StreamBuffer.prototype.isPassive = function (val) {
  if (val !== undefined)
    this._isPassive = val

  return this._isPassive
}

StreamBuffer.prototype.depth = function () {
  return this._buffer.size
}

StreamBuffer.prototype.empty = function () {
  return this._buffer.empty()
}

/*************************************************************************
  PRIVATE METHODS
  *************************************************************************/

StreamBuffer.prototype._flushBuffer = function () {
  var self = this

  if (this.isPassive()) {
    console.log(this._name, 'is passive no flush')
  } else {
    if (this.depth() > 0) {
      this._buffer.forEach(function (msg) {
        delete msg.name
      })

      var params = {
        stream: self._name,
        group: self._logGroupName,
        messages: this._buffer.toArray()
      }

      if (this._sequenceToken != undefined) {
        params.sequenceToken = self._sequenceToken
      }

      self._callback(params)
    } else {
      // console.log(this._name, 'flushing but no data', this.depth())
    }
  }
}

StreamBuffer.prototype._process = function () {
  this._flushBuffer()
}

module.exports = StreamBuffer
