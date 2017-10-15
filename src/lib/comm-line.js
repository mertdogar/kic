const LineClient = require('line-socket/client-node');
const config = require('../config.json');
const EventEmitterExtra = require('event-emitter-extra');

class LineModule extends EventEmitterExtra {
    constructor() {
        super();

        this.roomId = 'kime-coin';
        this.line = new LineClient(`ws://${config.LINE_SERVER.HOST}:${config.LINE_SERVER.PORT}`);
    }

    async init() {
        this.line.connect();

        this.line.on(this.roomId, message => {
            const {event, data} = message.payload;
            this.emit(event, data);
        });

        return new Promise((resolve, reject) => {
            this.line.on(LineClient.Event.CONNECTED, () => {
                this.line.send('subscribe', this.roomId)
                    .then(() => console.log('all good'))
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    async getPeers() {
        return this.line.send('getPeers');
    }

    async askPeer(peerId, data) {
        return this.line.send('sendMessage', {peerId, data});
    }

    listenEvent(eventname, cb) {
        this.line.on(eventname, cb);
    }

    broadcast(event, data) {
        this.line.send('publish', {
            room: this.roomId,
            data: {event, data}
        });
    }

    onPeerMessage(cb) {
        this.line.on('peerMessage', message => {
            cb(message.payload, (err, response) => {
                if (err) return message.reject(err);
                message.resolve(response);
            });
        });
    }
}


module.exports = LineModule;
