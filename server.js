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
    }
});

var usernames = {};
var rooms = ['room1','room2','room3'];

// Setup websocket stuff
var io = require('socket.io')(wsServer.listener);

io.on('connection', function (socket) {

    //Subscribe this socket to `action` events
    notifier.on('action', function (action) {
        // socket.emit('action', action);
        console.log(action);
        io.sockets.in(socket.room).emit('updatechat', socket.username, action);
    });

    socket.on('sendchat', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.in(socket.room).emit('updatechat', socket.username, data);
    });

    socket.on('adduser', function(username){
        socket.username = username;
        socket.room = 'room1';
        usernames[username] = username;
        socket.join('room1');
        socket.emit('updatechat', 'SERVER', 'You have connected to room1');
        socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
        socket.emit('updaterooms', rooms, 'room1');
    });

    socket.on('switchRoom', function(newRoom) {
        socket.leave(socket.room);
        socket.join(newRoom);
        socket.emit('updatechat', 'SERVER', 'You have connected to ' + newRoom);
        socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has left this room');
        socket.room = newRoom;
        socket.broadcast.to(newRoom).emit('updatechat', 'SERVER', socket.username + ' has joined this room.');
        socket.emit('updaterooms', rooms, newRoom);
    });

});

server.start(function () {
    console.log('Server started!');
});