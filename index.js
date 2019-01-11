// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
"use strict";
const http = require('https')
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const mqtt = require('mqtt');


const consoleWrapper = { "log": function () {
  // default is not to log
  if (config.logging === true) {
    console.log.apply(this, arguments);
  }
}}

var mqttOptions;
if (config.mqtt.serverUrl.indexOf('mqtts') > -1) {
  mqttOptions = { key: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.key')),
                  cert: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.cert')),
                  ca: fs.readFileSync(path.join(__dirname, 'mqttclient', '/ca.cert')),
                  checkServerIdentity: function() { return undefined }
  }
} else if (config.mqtt.username) {
  mqttOptions = { username: config.mqtt.username,
                  password: config.mqtt.password
                }
}
const mqttClient = mqtt.connect(config.mqtt.serverUrl, mqttOptions);

var mqttClientExternal;

if (config.mqttExternal) {
  var mqttOptionsExternal;
  if (config.mqttExternal.serverUrl.indexOf('mqtts') > -1) {
    mqttOptionsExternal = { key: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.key')),
                            cert: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.cert')),
                            ca: fs.readFileSync(path.join(__dirname, 'mqttclient', '/ca.cert')),
                            checkServerIdentity: function() { return undefined }
    }
  }
  mqttClientExternal = mqtt.connect(config.mqttExternal.serverUrl, mqttOptionsExternal);
}


mqttClient.on('connect',function() {
});


mqttClient.on('message', function(topic, message) {
});


const requestHandler = (request, response) => {
  var respondImmediately = true;
  var responseData =  { "version": "1.0",
                        "response": {
                          "outputSpeech": {
                            "type": "PlainText",
                            "text": "ok"
                          },
                          "shouldEndSession": true
                        }
                      };

  if (config.terminateSessionDefault  === false ) {
    responseData.response.shouldEndSession = false;
  }

  var requestData = '';
  request.on('data', function(chunk) {
    requestData = requestData + chunk.toString();
  });

  request.on('end', function(chunk) {
    if (request.url !== config.url) {
      return;
    }

    const jsonObject = JSON.parse(requestData);

    // Handle Launch request
    if (jsonObject.request.type === 'LaunchRequest') {
      responseData.response.outputSpeech.text = "Hi, I'm Michael";
      responseData.response.shouldEndSession = false;
      response.writeHead(200, {'Content-Type': 'application/json;charset=UTF-8'});
      response.end(JSON.stringify(responseData));
      return;
    }

    // Handle SessionEndedRequest
    if (jsonObject.request.type === 'SessionEndedRequest') {
      response.writeHead(200, {'Content-Type': 'application/json;charset=UTF-8'});
      response.end(JSON.stringify(responseData));
      return;
    }

    // Handle IntentRequest
    consoleWrapper.log(jsonObject);
    consoleWrapper.log(jsonObject.request.intent);

    const intent = jsonObject.request.intent;

    // get the device associated with the request some intents do not
    // have a device slot at all.  In this case we expect there to be
    // a default device entry
    var device = 'default';
    if ((intent.slots.Device) && (intent.slots.Device.value)) {
      device = intent.slots.Device.value.toString().toLowerCase().replace(/'/g,'').replace(/ /g,'');
    } else if ((intent.slots.SnapTarget) && (intent.slots.SnapTarget.value)) {
      device = intent.slots.SnapTarget.value.toString().toLowerCase().replace(/'/g,'').replace(/ /g,'');
    }

    if (intent && intent.name && config.intents[intent.name]) {
      const intentObject = config.intents[intent.name];
      var key = intentObject[device];
      if (key === undefined) {
        key = intentObject['default'];
      }
      consoleWrapper.log(key);
      if (key) {
        if (Object.prototype.toString.call(key) !== '[object Array]' ) {
          key = [ key ];
        }
        try {
          const slots = intent.slots;
          for (let i = 0; i < key.length; i++) {
            const topic = eval('`' + key[i].topic + '`');;
            let mqttClientHandle = mqttClient;
            if (key[i].server === 'external') {
              mqttClientHandle = mqttClientExternal;  
            }
            consoleWrapper.log('topic:' + topic);
            var message = key[i].message;
            if (message) {
              message = eval('`' + message + '`');
            } else {
              message = '';
            }
            consoleWrapper.log('message:' + message);

            // if there is a response topic setup to receive a response
            let listener;
            let timer;
            if (key[i].responseTopic) {
               listener = function(topic, message) {
                 if (topic === key[i].responseTopic) {
                   responseData.response.outputSpeech.text = message.toString();
                   response.writeHead(200, {'Content-Type': 'application/json;charset=UTF-8'});
                   response.end(JSON.stringify(responseData));
                   mqttClientHandle.removeListener('message', listener);
                   if (timer) {
                     clearTimeout(timer);
                   }
                 }
               };

               mqttClientHandle.on('message', listener);
               mqttClientHandle.subscribe(key[i].responseTopic);
            }

            // send out the message
            mqttClientHandle.publish(topic, message);

            // setup timeout in case we don't get a response if on is expected
            if (key[i].responseTopic) {
              respondImmediately = false;
              let timeout = 5000;
              if(key[i].responseTimeout) {
                timeout = key[i].responseTimeout;
              }
              timer = setTimeout(function() {
                mqttClientHandle.removeListener('message', listener);
                responseData.response.outputSpeech.text = 'Timed out waiting for response';
                response.writeHead(200, {'Content-Type': 'application/json;charset=UTF-8'});
                response.end(JSON.stringify(responseData));
              }, timeout);
            }
          }
        } catch (e) {
          consoleWrapper.log(e);
          responseData.response.outputSpeech.text = "I could not process your request";
        }
      } else {
        responseData.response.outputSpeech.text = "I could not find a device called " + device;
        consoleWrapper.log("Could not find device:" + device);
      }
    } else {
      responseData.response.outputSpeech.text = "Not sure what you wanted me to do";
    }
    if (respondImmediately) {
      response.writeHead(200, {'Content-Type': 'application/json;charset=UTF-8'});
      response.end(JSON.stringify(responseData));
    }
  });

  if (request.url !== config.url) {
    consoleWrapper.log(new Date() + ': invalid request received');
    response.end();
  }
}

// start the server
let options = new Object();
if (!config.nossl) {
    const options = {
      key: fs.readFileSync(path.join(__dirname, 'key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
    }
}

const server = http.createServer(options, requestHandler)
server.listen(config.port, (err) => {
  if (err) {
    return console.log('Could not start server', err);
  }

  console.log(`Serverlistening on ${config.port}`)
})
