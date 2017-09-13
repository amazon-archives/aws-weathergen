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

var randomstring = require('randomstring')
var config = require('../../../config/config')
var _ = require('lodash')
var fs = require('fs')

var Sensor = function (name, type, id) {
  if (this.constructor === Sensor) {
    throw new Error("Can't instantiate abstract class!")
  }

  this._validTypes = [ 'windspeed', 'rainfall', 'temperature', 'vibration']

  this._name = name
  this._id = id
  this._active = false // boolean
  this._since = undefined // long int
  this._stationId = undefined
  this.log = require('../log')
  this._mqttServer = undefined
  this._frequency = undefined
  this._interval = undefined
  this._loggingName = undefined

  this.log.info({name: this.getName(), msg: 'Initialising sensor ' + this._id})

  if (this._validTypes.indexOf(type) === -1) {
    this.log.error({name: this.getName(), msg: 'Invalid sensor type ' + type})
    process.exit(1)
  }

  this._type = type
}

Sensor.prototype.attach = function (station, cb) {
  var self = this
  this._station = station
  this.log.info({name: this.getName(), msg: 'Attached sensor to ' + this._station.getName()})
  this._createLoggingStream(this.getName(), function (res) {
    if (res) {
      throw new Error('Could not create stream ' + self.getName())
      process.exit(1)
    } else {
      self._since = new Date().getTime()
      self._mqttServer = station._mqttServer
      cb(false)
    }
  })
}

Sensor.prototype.start = function () {
  var self = this
  this.log.info({name: this.getName(), msg: 'Starting'})
  self.processForecast(this._station._forecast)

  this._interval = setInterval(function () {
    self.publish()
  }, 1000 / self._frequency)
}

Sensor.prototype.stop = function () {
  var self = this
  this.log.warn({name: this.getName(), msg: 'Stopping'})
  clearInterval(this._interval)
}

Sensor.prototype.getName = function () {
  return this._name + '_' + this._id
}

Sensor.prototype._createLoggingStream = function (name, cb) {
  cb()
// this.log.createLoggingStream(this._station.getLoggingGroupName(), this.getName(), function (res) {
//   cb()
// })
}

Sensor.prototype.publish = function () {}
Sensor.prototype.processForecast = function () {}

module.exports = Sensor
