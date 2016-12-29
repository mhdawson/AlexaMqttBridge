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
}
const mqttClient = mqtt.connect(config.mqtt.serverUrl, mqttOptions);

mqttClient.on('connect',function() {
});


mqttClient.on('message', function(topic, message) {
});


const requestHandler = (request, response) => {
  var responseData =  { "version": "1.0",
                        "response": {
                          "outputSpeech": {
                            "type": "PlainText",
                            "text": "ok"
                          }
                        }
                      };

  var requestData = '';
  request.on('data', function(chunk) {
    requestData = requestData + chunk.toString();
  });

  request.on('end', function(chunk) {
    if (request.url !== config.url) {
      return;
    }

    const jsonObject = JSON.parse(requestData);
    consoleWrapper.log(jsonObject);
    consoleWrapper.log(jsonObject.request.intent);

    const intent = jsonObject.request.intent;
    if (intent && intent.name && config.intents[intent.name]) {
      const key = config.intents[intent.name][intent.slots.Device.value];
      if (key) {
        const slots = intent.slots;
        try {
          const topic = eval('`' + key.topic + '`');;
          consoleWrapper.log('topic:' + topic);
          var message = key.message;
          if (message) {
            message = eval('`' + message + '`');
          } else {
            message = '';
          }
          consoleWrapper.log('message:' + message);
          mqttClient.publish(topic, message);
        } catch (e) {
          consoleWrapper.log(e);
          responseData.response.outputSpeech.text = "I could not process your request";
        }
      } else {
        responseData.response.outputSpeech.text = "I could not find a device called " +
          jsonObject.request.intent.slots.Device.value;
      }
    } else {
      responseData.response.outputSpeech.text = "Not sure what you wanted me to do";
    }
    response.writeHead(200, {'Content-Type': 'application/json;charset=UTF-8'});
    response.end(JSON.stringify(responseData));
  });

  if (request.url !== config.url) {
    consoleWrapper.log(new Date() + ': invalid request received');
    response.end();
  }
}

// start the server
const ssl_options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
}

const server = http.createServer(ssl_options, requestHandler)
server.listen(config.port, (err) => {
  if (err) {
    return console.log('Could not start server', err);
  }

  console.log(`Serverlistening on ${config.port}`)
})
