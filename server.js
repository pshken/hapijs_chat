var Hapi = require('hapi');

// Make an event emitter for managing communication
// between hapi and socket.io code

var EventEmitter = require('events');
var notifier = new EventEmitter();

// Setup API + WS server with hapi

var server = new Hapi.Server();
server.register(require('inert'), function () {});

server.connection({ port: 4000, labels: ['api'] });
server.connection({ port: 4001, labels: ['ws'] });

var apiServer = server.select('api');
var wsServer = server.select('ws');

apiServer.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {

        reply.file('./app/index.html');
    }
});

apiServer.route({
    method: 'POST',
    path: '/action',
    handler: function (request, reply) {
        var tmpMsg = request.payload['userName'] + ": " + request.payload['chatMsg']
        notifier.emit('action', { chatMsg: tmpMsg });
        console.log(tmpMsg);
        //reply('Sent!');
    }
});

// Setup websocket stuff
var io = require('socket.io')(wsServer.listener);

io.on('connection', function (socket) {

    // Subscribe this socket to `action` events

    notifier.on('action', function (action) {
        socket.emit('action', action);
    });
});

server.start(function () {
    console.log('Server started');
});