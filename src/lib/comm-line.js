const LineClient = require('line-socket/client-node');


class LineModule {
    constructor() {
        this.roomId = 'kime-coin';
        this.line = new LineClient('ws://127.0.0.1:3000');
    }

    async init() {
        this.line.connect();

        return new Promise((resolve, reject) => {
            this.line.on(LineClient.Event.CONNECTED, () => {
                this.line.send('subscribe', this.roomId)
                    .then(() => console.log('all good'))
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    broadcast(event, data) {
        this.line.send('publish', {
            room: this.roomId,
            data: {event, data}
        });
    }

    listen(event, cb) {
        this.line.on(this.roomId, message => {
            console.log('heloo', message);
            if (message.payload.event == event)
                cb(message.payload.data);
        });
    }
}


module.exports = LineModule;
