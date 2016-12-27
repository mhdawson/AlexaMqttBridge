// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
const http = require('https')
const fs = require('fs');
const path = require('path');
const config = require('./config.json');


const consoleWrapper = { "log": function () {
  // default is not to log
  if (config.logging === true) {
    console.log.apply(this, arguments);
  }
}}


const requestHandler = (request, response) => {
  // validate that it is an authentic request
  if (request.url !== config.url) {
    response.abort();
  }

  // setup default response
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
    const jsonObject = JSON.parse(requestData);
    consoleWrapper.log(jsonObject);
    consoleWrapper.log(jsonObject.request.intent);

    const intent = jsonObject.request.intent;
    if (config.intents[intent.name]) {
      if (config.intents[intent.name][intent.slots.Device.value]) {

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

}


// start the server
ssl_options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
}


const server = http.createServer(ssl_options, requestHandler)
server.listen(config.port, (err) => {
  if (err) {
    return console.log('Could not start server', err);
  }

  console.log(`Server listening on ${config.port}`)
})
