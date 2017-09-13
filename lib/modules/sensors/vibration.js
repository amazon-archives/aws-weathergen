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

var Sensor = require('./sensor')
var _ = require('lodash')

var Vibration = function (name) {
  // Vibration initialization...
  Sensor.apply(this, arguments)
  this._frequency = 1

  this._numberOfSamples = this._frequency * 24 * 60 * 60
  this._data = []
  this._publishPoint = 0

  for (var i = 0; i <= this._numberOfSamples; i++) {
    this._data[i] = 1.000
  }
}

Vibration.prototype = Object.create(Sensor.prototype)
Vibration.prototype.constructor = Vibration

Vibration.prototype.generateDistribution = function (forecast) {
  var self = this
  this.log.info({name: this.getName(), msg: 'Generating vibration data'})

  for (var i = 0; i < this._data.length;i++) {
    this._data[i] = this._data[i] + _.random(-0.5, 0.5)
  }
}

Vibration.prototype.processForecast = function (forecast) {
  var self = this
  this.generateDistribution(forecast)
}

Vibration.prototype.publish = function () {
  var self = this
  if (this._mqttServer == undefined) {
    return
  }

  var message = {
    topic: 'weather/' + this._station.getName() + '/' + this._name,
    payload: {
      sensor_timestamp: new Date().getTime(),
      sensor_value: this._data[this._publishPoint++],
      direction: -1
    },
    qos: 0, // 0, 1, or 2
    retain: false // or true
  }
  message.payload = JSON.stringify(message.payload)

  this._mqttServer.publish(message, function () {
    self.log.info({name: self.getName(), msg: message.payload})
    // wrap back to the first element if we hit the last element of the source data
    if (self._publishPoint > self._numberOfSamples) {
      self._publishPoint = 0
    }
  })
}

module.exports = Vibration
