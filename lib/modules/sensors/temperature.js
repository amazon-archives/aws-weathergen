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
var moment = require('moment')

var Temperature = function (name) {
  // Temperature initialization...
  Sensor.apply(this, arguments)

  this._frequency = 1
  this._numberOfSamples = this._frequency * 24 * 60 * 60
  this._temperatureData = []
  this._data = []
  this._publishPoint = 0

  for (var i = 0; i <= this._numberOfSamples; i++) {
    this._data[i] = 0
  }
}

Temperature.prototype = Object.create(Sensor.prototype)
Temperature.prototype.constructor = Temperature

Temperature.prototype.processForecast = function (forecast) {
  var self = this
  this.log.info({name: this.getName(), msg: 'Generating temperature data'})

  var count = 0
  _.each(forecast['daily']['data'], function (data) {
    var startTime = moment.unix(data['temperatureMinTime']).utc().format('HH:mm:ss')
    var maxTime = moment.unix(data['temperatureMaxTime']).utc().format('HH:mm:ss')
    var endTime = moment.unix(data['temperatureMinTime']).add(24, 'hours').utc().format('HH:mm:ss')

    self._temperatureData[count++] = {
      startTemp: data['temperatureMin'],
      startTime: startTime,
      startStamp: moment.duration(startTime, 'seconds').asSeconds(),
      maxTemp: data['temperatureMax'],
      maxTime: maxTime,
      maxStamp: moment.duration(maxTime, 'seconds').asSeconds(),
      maxDuration: _.random(60, 14400), // between 1 min and 2 hours
      endTemp: parseFloat((((data['temperatureMax'] - data['temperatureMin']) * (_.random(-30, 30) / 100)) + data['temperatureMin']).toFixed(2)),
      endTime: endTime,
      endStamp: moment.duration(endTime, 'seconds').asSeconds()
    }
  })

  if (_.isObject(self._temperatureData[0])) {
    var temp = self._temperatureData[0]

    var run = temp['maxStamp'] - temp['startStamp']
    var rise = temp.maxTemp - temp.startTemp
    var scale = rise / run
    var totalRun = 0

    for (var i = 0; i <= run;i++) {
      var value = (scale * i) + temp.startTemp
      self._data[i + temp.startStamp] = value
      totalRun++
    }

    for (var i = 0; i < temp.maxDuration;i++) {
      self._data[i + temp.maxStamp] = temp.maxTemp
      totalRun++
    }

    var startTime = (temp.maxStamp + temp.maxDuration)
    var endTime = 86400
    var startTemp = temp.maxTemp
    var endTemp = temp.endTemp

    var run = endTime - startTime
    var rise = endTemp - startTemp
    var scale = rise / run

    var p = 0
    for (var i = startTime; i <= endTime; i++) {
      var value = temp.maxTemp + (scale * p)
      self._data[i] = value
      totalRun++
      p++
    }

    var run = temp.startStamp
    var rise = temp.startTemp - self._data[86400]
    var scale = rise / run
    p = 0
    for (var i = 0; i <= temp.startStamp;i++) {
      var value = self._data[86400] + (scale * p)
      self._data[i] = value
      p++
    }
  }
}

Temperature.prototype.publish = function () {
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

module.exports = Temperature
