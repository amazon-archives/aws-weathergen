# Weather Data Generator

Generating streams of weather data with mqtt is made simple using this application. 

By supplying a state, city, longtitude and latitude, along with a sensor name, an MQTT stream of weather data will be generated for you. This stream includes:
  
  - rain - measured in inches/min
  - temperature - measured in degress F
  - vibration - measured in G's
  - windspeed - in direction (degrees) and magnitude (mph)

We use the weather forecast and history API from our friends at forecast.io/darksky.net. You will need to register for their free tier [here](https://darksky.net/dev/register). 

## Requirements
- node.js => v6.11.2
- An API key from forecast.io

## Installation

- After cloning this repository, the application dependencies must be installed. you can use either NPM or yarn.

```npm install``` or ```yarn install```

## Running

There are 5 parameters that need to be supplied:

  - -s    --sensor STRING    Sensor Id
  - -t    --state [STRING]   State 
  - -c    --city STRING      City
  - -lng  --longtitude       Longtitude
  - -lat  --latitude         Latitude

An exmaple command line would be

```./generate.js --state "California" --city "Palo Alto" --longtitude "-122.142776" --latitude "37.399782" --sensor "sensor_1"```

The output on the command-line will look like

```
[2017-08-27T22:51:59.480Z]  INFO: rain_57add6cd692137b6/2035 on acbc327c2071: {"sensor_timestamp":1503874319479,"sensor_value":0,"direction":-1}
[2017-08-27T22:51:59.486Z]  INFO: temp_57fa6c97c80dcb71/2035 on acbc327c2071: {"sensor_timestamp":1503874319482,"sensor_value":58.71017678571429,"direction":-1}
[2017-08-27T22:51:59.604Z]  INFO: vib_7e60e0663c40a9a2/2035 on acbc327c2071: {"sensor_timestamp":1503874319600,"sensor_value":1.3877434481814688,"direction":-1}
[2017-08-27T22:51:59.641Z]  INFO: ws_c5a01cb911390d11/2035 on acbc327c2071: {"sensor_timestamp":1503874319641,"sensor_value":0.45,"direction":292.965}
```

This will generate a stream of weather data on an MQTT topic in the following format

```weather/[state]/[city]/[type: rain|temp|vib|ws]```

Hence the following topics for this example are

```
weather/California/Palo_Alto/ws
weather/California/Palo_Alto/temp
weather/California/Palo_Alto/rain
weather/California/Palo_Alto/vib
```

For example

```weather/California/Palo_Alto/ws```

This will provide the following payload

```json
{"sensor_timestamp":1503873597203,"sensor_value":0.451,"direction":291.841}
{"sensor_timestamp":1503873598207,"sensor_value":0.451,"direction":291.837}
{"sensor_timestamp":1503873599208,"sensor_value":0.451,"direction":291.833}
{"sensor_timestamp":1503873600210,"sensor_value":0.451,"direction":291.829}
{"sensor_timestamp":1503873601214,"sensor_value":0.451,"direction":291.826}
{"sensor_timestamp":1503873602218,"sensor_value":0.451,"direction":291.822}
{"sensor_timestamp":1503873603223,"sensor_value":0.451,"direction":291.818}
```

## Subscribing using mqtt

You can subscribe to the streams using any standards complaint MQTT client. For example there is a command-line node client [MQTT.js](https://www.npmjs.com/package/mqtt) and a great graphical client [MQTT.fx](http://www.mqttfx.org/).

Using [MQTT.js](https://www.npmjs.com/package/mqtt) you can subscribe using the following:

```bash 
mqtt subscribe -h localhost -t "weather/California/Palo Alto/ws" ``` or to any of the sensorsm, such as ```mqtt subscribe -h localhost -t "weather/California/Palo Alto/temp"
```

This will return the stream of data such as below

```json
{"sensor_timestamp":1503873942218,"sensor_value":61.97070238095238,"direction":-1}
{"sensor_timestamp":1503873943222,"sensor_value":61.97065674603174,"direction":-1}
{"sensor_timestamp":1503873944226,"sensor_value":61.97061111111111,"direction":-1}
{"sensor_timestamp":1503873945227,"sensor_value":61.97056547619048,"direction":-1}
{"sensor_timestamp":1503873946231,"sensor_value":61.97051984126984,"direction":-1}
{"sensor_timestamp":1503873947233,"sensor_value":61.97047420634921,"direction":-1}
```


**Note:** direction will be -1, for all non-vectorise measurements. Hence is only used in the windspeed (ws) stream.