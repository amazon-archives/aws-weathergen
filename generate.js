#!/usr/local/bin/node
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
var DEBUG = false
var self = this

if (!DEBUG) {
  var methods = ['log', 'debug', 'warn', 'info']
  for (var i = 0;i < methods.length;i++) {
    console[methods[i]] = function () {}
  }
}

var cli = require('cli')
var crypto = require('crypto')

var options = cli.parse({
  // station: ['s', 'Station id', 'string', false],
  sensor: ['s', 'Sensor Id', 'string', false],
  state: ['t', 'State', 'string', 'false'],
  city: ['c', 'City', 'string', false],
  longtitude: ['longtitude', 'Longtitude', 'string', false],
  latitude: ['latitude', 'Latitude', 'string', false]
})

if (options.sensor == undefined || !options.sensor) {
  console.log('A sensor id must be supplied')
  process.exit(1)
}

if (options.state == undefined || !options.state) {
  console.log('A state name must be supplied')
  process.exit(1)
}

if (options.city == undefined || !options.city) {
  console.log('A city name must be supplied')
  process.exit(1)
}

if (options.longtitude == undefined || !options.longtitude) {
  console.log('A longtitude must be supplied')
  process.exit(1)
}

if (options.latitude == undefined || !options.latitude) {
  console.log('A latitude must be supplied')
  process.exit(1)
}

var _ = require('lodash')
var log = require('./lib/modules/log')
var station = require('./lib/modules/station')
var Rainfall = require('./lib/modules/sensors/rainfall')
var Temperature = require('./lib/modules/sensors/temperature')
var Vibration = require('./lib/modules/sensors/vibration')
var WindSpeed = require('./lib/modules/sensors/windspeed')

log.init({
  destination: ['local'],
  defaultLevel: 'debug',
  name: 'weatherGen'
})

var deviceIdHash = crypto.createHash('sha256').update(options.sensor).digest('hex').toString()

var rainfall = new Rainfall('rain', 'rainfall', deviceIdHash.substr(0, 16))
var temperature = new Temperature('temp', 'temperature', deviceIdHash.substr(16, 16))
var vibration = new Vibration('vib', 'vibration', deviceIdHash.substr(32, 16))
var windspeed = new WindSpeed('ws', 'windspeed', deviceIdHash.substr(48, 16))

var sensors = [rainfall, temperature, vibration, windspeed]

station.init(options, function () {
  _.each(sensors, function (sensor, index) {
    station.attachSensor(sensor)
    sensor.start()
  })
})

process.on('SIGINT', function () {
  station.kill()
    .then(function () {
      console.log('finished')
      process.exit()
    })
})
