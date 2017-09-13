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

var WindSpeed = function (name) {
  // WindSpeed initialization...
  Sensor.apply(this, arguments)
  this._frequency = 1
  this._numberOfSamples = this._frequency * 24 * 60 * 60
  this._windSpeedData = Array.apply(null, Array(this._numberOfSamples)).map(function (x) { return {value: 0, direction: -1} })
  this._publishPoint = 0
}

WindSpeed.prototype = Object.create(Sensor.prototype)
WindSpeed.prototype.constructor = WindSpeed

WindSpeed.prototype.processForecast = function (forecast) {
  var self = this
  this.log.info({name: this.getName(), msg: 'Generating wind speed data'})

  var rawData = forecast['hourly']['data']
  var offset = 0

  _.each(forecast['hourly']['data'], function (wind, index) {
    var nextIndex = index + 1
    var windSpeed
    var windDirection

    var currentWindSpeed = wind.windSpeed
    var currentWindBearing = wind.windBearing

    if (nextIndex < rawData.length) {
      var nextWindSpeed = forecast['hourly']['data'][nextIndex]['windSpeed']
      var nextWindBearing = forecast['hourly']['data'][nextIndex]['windBearing']
    } else {
      nextWindSpeed = currentWindSpeed
      nextWindBearing = currentWindBearing
    }

    var windSpeedIncrement = (nextWindSpeed - currentWindSpeed) / 3600
    var windDirectionIncrement = (nextWindBearing - currentWindBearing) / 3600

    for (var i = 1;i <= 3600;i++) {
      currentWindSpeed = currentWindSpeed + windSpeedIncrement
      currentWindBearing = currentWindBearing + windDirectionIncrement

      self._windSpeedData[offset + i] = {
        value: currentWindSpeed,
        direction: currentWindBearing
      }
    }
    offset = offset + 3600
  })
}

WindSpeed.prototype.publish = function () {
  var self = this
  if (this._mqttServer == undefined) {
    return
  }

  var message = {
    topic: 'weather/' + this._station.getName() + '/' + this._name,
    payload: {
      sensor_timestamp: new Date().getTime(),
      sensor_value: Math.round(self._windSpeedData[this._publishPoint]['value'] * 1e3) / 1e3,
      direction: Math.round(self._windSpeedData[this._publishPoint]['direction'] * 1e3) / 1e3
    },
    qos: 0, // 0, 1, or 2
    retain: false // or true
  }
  message.payload = JSON.stringify(message.payload)

  this._mqttServer.publish(message, function () {
    self.log.info({name: self.getName(), msg: message.payload})
    self._publishPoint++
    // wrap back to the first element if we hit the last element of the source data
    if (self._publishPoint > self._numberOfSamples) {
      self._publishPoint = 0
    }
  })
}

module.exports = WindSpeed
