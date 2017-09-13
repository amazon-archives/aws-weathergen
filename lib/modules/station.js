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
var AWS = require('aws-sdk')
var randomstring = require('randomstring')
var http = require('http')
var mosca = require('mosca')
var https = require('https')
var http = require('http')
var Q = require('q')
var fs = require('fs')

module.exports = function () {
  var _id = undefined
  var _loggingName = 'station'
  var _city = undefined
  var _state = undefined
  var _loggingGroupName = undefined
  var _ipAddress = undefined
  var _since = undefined
  var _long = undefined // float
  var _lat = undefined // floar
  var _active = false // boolean
  var _lat
  var _long
  var _accessKeyId
  var _secretAccessKey
  var _sessionToken
  var _identityId
  var _mqttServer
  var _forecast
  var _isInTestMode

  var _sensors = []

  /**
   * initialise the module
   * 
   * @param cb (description)
   */
  function init (options, cb) {
    var self = this
    // var stationId = options.station
    var isLocal = options.local
    _isInTestMode = options.test

    _getStationDetails(options, function (err, stationName) {
      if (err) {
        process.exit(1)
      }

      var moscaSettings = {
        port: 1883, // mosca (mqtt) port
        backend: {
          type: config.mqtt.type,
          url: config.mqtt.url,
          pubsubCollection: config.mqtt.pubsubCollection
        }
      }

      if (config.mqtt.wsServer.enabled == true) {
        log.info({name: _loggingName,msg: 'Enabling websockets on port ' + config.mqtt.wsServer.port})
        moscaSettings['http'] = {
          port: config.mqtt.wsServer.port,
          bundle: true,
          static: './'
        }
      }

      self._mqttServer = new mosca.Server(moscaSettings) // here we start mosca

      self._mqttServer.on('clientConnected', function (client) {
        log.info({name: _loggingName,msg: 'WebSocket client connected: ' + client.id})
      })

      self._mqttServer.on('ready', function () {
        log.info({ name: _loggingName, msg: 'MQTT Server Running' })

        log.info({name: _loggingName,msg: 'Fetching weather data'})
        var yesterday = Math.floor((new Date().getTime() - 86400) / 1000)
        var path = '/forecast/' + config.forecast.apiKey + '/' + _lat + ',' + _long + ',' + yesterday

        https.get({
          host: config.forecast.url,
          path: path
        }, function (response) {
          var body = ''
          response.on('data', function (d) {
            body += d
          })
          response.on('end', function () {
            self._forecast = JSON.parse(body)
            cb()
          })
        })
      })
    })
  }

  function kill () {
    var self = this
    var deferred = Q.defer()

    log.warn({ name: _loggingName, msg: 'Terminating weather data server.....' })

    _sensors.forEach(function (sensor) {
      sensor.stop()
    })

    log.warn({ name: _loggingName, msg: 'Finalising cleanup' })
    process.exit('SIGINT')

    return deferred.promise
  }

  /**
   * attach a sensor to this station
   * 
   * @param sensor (description)
   */
  function attachSensor (sensor) {
    sensor.attach(this, function (res) {
      _sensors.push(sensor)
    })
  }

  /**
   * get the name of then station
   * 
   * @returns (description)
   */
  function getName () {
    return _state + '/' + _city
  }

  /**
   * get the cloudwatch logging  group name used for the station
   * 
   * @returns (description)
   */
  function getLoggingGroupName () {
    return _loggingGroupName
  }

  /*************************************************************************
  PRIVATE METHODS
  *************************************************************************/

  /**
   * get the station details from the station database
   * 
   * @param cb (description)
   */
  function _getStationDetails (options, cb) {
    var self = this

    var station = options.station
    _id = 1
    _loggingName = options.state + '_' + options.city
    _city = options.city
    _lat = options.latitude
    _long = options.longtitude
    _state = options.state
    _loggingGroupName = _loggingName + '_' + _id

    cb(null, station)
  }

  return {
    init: init,
    attachSensor: attachSensor,
    getName: getName,
    getLoggingGroupName: getLoggingGroupName,
    kill: kill
  }
}()
