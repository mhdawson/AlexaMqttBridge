# AlexaMqttBridge

This project/module provides a simple bridge between alexa
and mqtt.  

When you speak to Alexa this project receives and decodes
the https post from Alexa with the information for the
intent.  It then posts the configured message on the
configured topic.  Both the topic and message are
javascript string templates.  

## Installation

Install by running:

```
npm install AlexaMqttBridge
```

or

```
npm install https://github.com/mhdawson/AlexaMqttBridge.git
```

then copy config.json.sample to config.json and fill
in the configuration as required.

## Configuration

You will need to create a custom skill and a matching config.json
file for the bridge.

### Alexa skill configuration

You will first need to configure a custom skill at developer.amazon.com
(at least for now) which is beyond the scope of this readme. This section
will only provide some specifics with respect to using a custome skill
with the bridge.

The configuration for the endpoint for the custom skill must be
the url at which this module will be running/responding.  For example:

```
https://alexa.myhost.com/alexa?XXXXXXXXX
```

Were XXXXXX is a secret used to ensure we only accept requests from Alexa.
The portion after ```https://alexa.myhost.com/``` must match the value
you configure for url in config.json as described below.

You will also have to create your interaction module which matches
the intents configured in config.json.  This is my configuration for
the sample config.json:

SCHEMA
```
{
  "intents": [
    {
      "intent": "TurnOff",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        }
      ]
    },
    {
      "intent": "TurnOn",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        }
      ]
    },
    {
      "intent": "Tune",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        },
        {
          "name": "Channel",
          "type": "AMAZON.NUMBER"
        }
      ]
    },
    {
      "intent": "VolumeUp",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        },
        {
          "name": "Repeat",
          "type": "AMAZON.NUMBER"
        }
      ]
    },
    {
      "intent": "VolumeDown",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        },
        {
          "name": "Repeat",
          "type": "AMAZON.NUMBER"
        }
      ]
    },
    {
      "intent": "Mute",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        }
      ]
    },
    {
      "intent": "Pause",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        }
      ]
    },
    {
      "intent": "UnPause",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        }
      ]
    },
    {
      "intent": "Stop",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        }
      ]
    },
    {
      "intent": "Seek",
      "slots": [
        {
          "name": "Device",
          "type": "List_of_devices"
        },
        {
          "name": "Time",
          "type": "AMAZON.NUMBER"
        }
      ]
    },
    {
      "intent": "Play",
      "slots": [
        {
          "name": "Media",
          "type": "AMAZON.TVSeries"
        },
        {
          "name": "Device",
          "type": "List_of_devices"
        }
      ]
    }
  ]
}
```

CUSTOM slots
```
List_of_devices

living room lights
living room right
living room left
dining room
power monitor
TV
alarm
```

SAMPLE UTTERANCES

```
TurnOn Turn on {Device}
TurnOff Turn off {Device}
TurnOn to Turn on {Device}
TurnOff to Turn off {Device}
Tune {Device} to channel {Channel}
Tune {Device} channel {Channel}
Tune set {Device} channel {Channel}
Tune set {Device} to channel {Channel}
Tune to set {Device} channel {Channel}
Tune to set {Device} to channel {Channel}
VolumeUp {Device} volume up {Repeat}
VolumeDown {Device} volume down {Repeat}
VolumeUp to turn {Device} volume up {Repeat}
VolumeDown to turn {Device} volume down {Repeat}
VolumeUp turn {Device} volume up {Repeat}
VolumeDown turn {Device} volume down {Repeat}
Mute mute {Device}
Play play {Media} on {Device}
UnPause unpause {Device}
Pause pause {Device}
Seek seek {Device} to {Time}
Stop stop {Device}
```

While your custom skill is in test mode you will have to request it using the
form:

```
Alexa ask 'invocationName' XXXX
```

were 'invocationName' is the invocation name you assigned to the custom skill
and XXX is the utterance.

## Bridge Configuration

The bridge configuration includes the following main fields:

* **logging** - if true enables logging.
* **port** - ort on which the bridge will listen.
* **url** - url that we expect when a request is received.  Should be unique
  and match that configured for the custom skill.  For example :
  ```
  alexa?auvy612312wdxcfr21123
  ```
* **mqttServerUrl** - url of the mqtt server to connect to.  This can
  either start with tcp:// or mqtts://. If it starts with mqtts://
  there must be a subdirectory in the lib directory called mqttclient
  which contains ca.cert, client.cert, client.key which contain the
  key and associated certificates for a client which is authorized
  to connect to the mqtt server.
* **intents** - the intents to be bridged to mqtt.  Object with one or more
  fields with the name of each field matching one of the intents configured
  for the skill.  For example ```TurnOn```.  The value for the field
  is then an object with one or more fields, each of which corresponds to a
  device that the intent will act on. For example: ```alarm```.  The value
  for that field is then an object with a topic and message field. The topic
  and message field are javascript templates that will be evaluated in a context
  where the variable 'slots' can be used within the template.  The slots
  variable will have a field for each of the slots configured for the itntent.
  In addition to the topic and message field there can be an optional field
  called responseTopic.  If this field exists then the bridge will wait on
  that topic for the resonse for Alexa to say in response to the command. If
  there is a responseTopic, you can also optionally include the
  responseTimeout field to change the timeout in milliseconds after which the
  bridge will stop waiting for a response (the default is 5000ms).

The folowing is an example matching the skill configuration shown above:

```
  "intents": { "TurnOn": { "power monitor": { "topic": "alexa", "message": "received ${slots.Device.value} on" },
                         "alarm": { "topic": "house/alarm/control", "message": "arm" },
                         "living room right": { "topic": "house/x10", "message": "A,1,1" },
                         "living room left": { "topic": "house/x10", "message": "A,2,1" },
                         "dining room": { "topic": "house/x10", "message": "A,5,1" }
                       },
             "TurnOff": { "power monitor": { "topic": "alexa", "message": "received ${slots.Device.value} off" },
                          "living room lights": [ { "topic": "house/x10", "message": "A,5,0" },
                                                  { "topic": "house/x10", "message": "A,1,0:1000" },
                                                  { "topic": "house/x10", "message": "A,2,0:2000" } ],
                          "living room right": { "topic": "house/x10", "message": "A,1,0" },
                          "living room left": { "topic": "house/x10", "message": "A,2,0" },
                          "dining room": { "topic": "house/x10", "message": "A,5,0" }
                        },
             "Tune": { "TV": { "topic": "home/harmony/hubs/harmony-hub/devices/rogers-dvr/command",
                               "message": "${slots.Channel.value.split('').join(' ')}" } },
             "VolumeUp": { "TV": { "topic": "home/harmony/hubs/harmony-hub/devices/samsung-tv/command",
                                   "message": "volume-up:${slots.Repeat.value}" },
                                   "stereo": { "topic": "home/harmony/hubs/harmony-hub/devices/insignia-av-receiver/command",
                                   "message": "volume-up:${slots.Repeat.value}" }
                         },
             "VolumeDown": { "TV": { "topic": "home/harmony/hubs/harmony-hub/devices/samsung-tv/command",
                                     "message": "volume-down:${slots.Repeat.value}" },
                                     "stereo": { "topic": "home/harmony/hubs/harmony-hub/devices/insignia-av-receiver/command",
                                     "message": "volume-down:${slots.Repeat.value}" }
                           },
             "Mute": { "TV": { "topic": "home/harmony/hubs/harmony-hub/devices/samsung-tv/command",
                               "message": "mute" } },
             "Play": { "TV": { "topic": "house/dlnaplay/play",
                               "message": "${slots.Media.value}",
                               "responseTopic": "house/dlnaplay/response" } },
             "UnPause": { "TV": { "topic": "house/dlnaplay/control",
                               "message": "play" } },
             "Pause": { "TV": { "topic": "house/dlnaplay/control",
                               "message": "pause" } },
             "Stop": { "TV": { "topic": "house/dlnaplay/control",
                               "message": "stop" } },
             "Seek": { "TV": { "topic": "house/dlnaplay/control",
                               "message": "seek:${slots.Time.value}" } }
          },
```

In the case of some of the "TV" commands, the topics are setup so that they can control
the TV through this project [harmony-api](https://github.com/maddox/harmony-api).
This is a good illustration of the power of exposing services through mqtt. I
was easily able to add voice control to the harmony hub using an existing project
that provided an mqtt interface.  Similary, voice control was added to my
X10 devices using this project which exposes an mqtt interfce: [micro-app-mqtt-x10-bridge](https://github.com/mhdawson/micro-app-mqtt-x10-bridge).
