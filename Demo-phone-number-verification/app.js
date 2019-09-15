
var express = require('express');
var twilio = require('twilio');

var app = express();

app.post('/sms', function(req, res) {
  var twiml = new twilio.TwimlResponse();
  twiml.message('The Robots are coming! Head for the hills!');
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.listen(80,function(){
       console.log("server started at 80!!");
});

