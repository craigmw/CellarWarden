//testSockets.js - Test socket.io functions in Node.js.
var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var requestIp = require('request-ip');
server.listen(3000);

var ipMiddleware = function(req, res) {
    return requestIp.getClientIp(req);
};

var ip = null;
app.get("/", function (req, res) {
   ip = ipMiddleware(req, res);
   res.sendFile(__dirname + "/index.html");
});

io.on("connection", function (socket) {
   // send the ip to user
});