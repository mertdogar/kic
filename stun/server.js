const omit = require('lodash/omit');
const Server = require('line-socket/server');
const server = new Server({port: 3000});
const {isString, isObject} = require('lodash');

server.on('connection', function(connection) {
    console.log(`Connection:  ${connection.id}`);

    connection.on('sendMessage', message => onSendMessage(connection, message));
    connection.on('getPeers', message => onGetPeers(connection, message));
    connection.on('publish', message => onPublish(connection, message));
    connection.on('subscribe', message => onSubscribe(connection, message));
    connection.on('unsubscribe', message => onUnsubscribe(connection, message));
    connection.on('ping', message => onPing(connection, message));
})

function getRoomName(roomName) {
    return `room_${roomName}`;
}

function onPublish(connection, message) {
    if (!isObject(message.payload)) {
        console.log('Error: Could not parse payload of publish event.');
        return message.reject(new Error('Could not parse payload of publish event.'));
    }

    const {room, data} = message.payload;
    const roomInstance = server.getRoom(getRoomName(room));
    roomInstance.broadcast(room, data);
    message.resolve();
}

function onSubscribe(connection, message) {
    if (!isString(message.payload)) {
        console.log('Error: Could not parse payload of subscribe event.');
        return message.reject(new Error('Could not parse payload of subscribe event.'));
    }

    const roomName = message.payload;
    connection.joinRoom(getRoomName(roomName));
    message.resolve();
}

function onUnsubscribe(connection, message) {
    if (!isString(message.payload)) {
        console.log('Error: Could not parse payload of unsubscribe event.');
        return message.reject(new Error('Could not parse payload of unsubscribe event.'));
    }

    const roomName = message.payload;
    connection.leaveRoom(getRoomName(roomName));
    message.resolve();
}


function onGetPeers(connection, message) {
    const roomNames = connection.getRooms();
    const room = server.getRoom(roomNames[0]);
    const peerIds = Object.keys(room.getConnections())
                        .filter(i => i != connection.id);
    message.resolve(peerIds);
}

function onSendMessage(connection, message) {
    if (!isObject(message.payload)) {
        console.log('Error: Could not parse payload of send message event.');
        return message.reject(new Error('Could not parse payload of publish event.'));
    }

    const {peerId, data} = message.payload;
    const roomNames = connection.getRooms();
    const room = server.getRoom(roomNames[0]);

    const otherConnection = room.getConnectionById(peerId);

    if (!otherConnection)
        return message.reject(new Error(`Peer ${peerId} is offline`));

    otherConnection
        .send('peerMessage', {peerId: connection.id, data})
        .then(response => message.resolve(response))
        .catch(err => message.reject(err));
}

function onPing(connection, message) {
    message.resolve('pong');
}

function onDisconnect(connection) {
    console.log(`Disconnection: ${connection.id}`);
}

server
    .start()
    .then(() => {
        console.log('Info: Server started');
    })
    .catch((err) => {
        console.log(`Error: Server could not started`, err);
    });