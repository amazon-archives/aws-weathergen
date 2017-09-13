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

/**
 * precipIntensity: A numerical value representing the average expected intensity 
 * (in inches of liquid water per hour) of precipitation occurring at the given time 
 * conditional on probability (that is, assuming any precipitation occurs at all). 
 * A very rough guide is that a value of 0 in./hr. corresponds to no precipitation, 0.002 in./hr. 
 * corresponds to very light precipitation, 0.017 in./hr. corresponds to light precipitation, 0.1 in./hr. 
 * corresponds to moderate precipitation, and 0.4 in./hr. corresponds to heavy precipitation.
 */
'use strict'

var Sensor = require('./sensor')
var _ = require('lodash')
var gaussian = require('../gaussian')

var Rainfall = function (name) {
  // Rainfall initialization... 
  Sensor.apply(this, arguments)

  this._frequency = 1
  this._numberOfSamples = this._frequency * 24 * 60 * 60
  this._rainFallData = Array.apply(null, Array(this._numberOfSamples)).map(function (x) { return 0 })
  this._publishPoint = 0
}

Rainfall.prototype = Object.create(Sensor.prototype)
Rainfall.prototype.constructor = Rainfall

Rainfall.prototype.generateDistribution = function (forecast) {
  var steps = 0.1 / 60 // 1 hour in 1 second intervals
  var variance = _.random(0.01, 1, true) // tighter

  var max = 3.00
  var min = -3.00
  var mean = _.random(min - (min / 2), max - (max / 2), true) // shift horizonal offset

  var totalSamples = (max - min) / steps
  var distribution = gaussian(mean, variance)
  var curve = []

  var count = min
  while (count <= max){
    curve.push(distribution.pdf(count))
    count += steps
  }

  return {
    data: curve,
    min: min,
    max: max,
    mean: mean,
    totalSamples: totalSamples,
    steps: steps,
    variance: variance
  }
}

Rainfall.prototype.processForecast = function (forecast) {
  var self = this
  this.log.info({name: this.getName(), msg: 'Generating rainfall data'})

  var count = 0
  var distributionData = this.generateDistribution()
  var distributionCurve = distributionData.data
  var offset = (distributionData.mean / (distributionData.max - distributionData.min)) / distributionData.steps

  var i = 0
  _.each(forecast['hourly']['data'], function (data) {
    if (data['precipIntensity'] > 0) {
      _.each(distributionCurve, function (scalingFactor) {
        self._rainFallData[count++] = data['precipIntensity'] * scalingFactor
      })
    } else {
      count = count + 3600
    }
  })
}

Rainfall.prototype.publish = function () {
  var self = this
  if (this._mqttServer == undefined) {
    return
  }

  var message = {
    topic: 'weather/' + this._station.getName() + '/' + this._name,
    payload: {
      sensor_timestamp: new Date().getTime(),
      sensor_value: this._rainFallData[this._publishPoint++],
      direction: -1
    },
    qos: 0, // 0, 1, or 2
    retain: false // or true
  }
  message.payload = JSON.stringify(message.payload)

  this._mqttServer.publish(message, function () {
    self.log.info({ name: self.getName(), msg: message.payload })
    // wrap back to the first element if we hit the last element of the source data
    if (self._publishPoint > self._numberOfSamples) {
      self._publishPoint = 0
    }
  })
}

module.exports = Rainfall
