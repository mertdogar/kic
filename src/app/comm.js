const CommModule = require('../lib/comm-line');


class Communications {
    constructor() {
        this.module = new CommModule();
    }

    async init() {
        await this.module.init();
    }

    announceNewBlock(block) {
        this.module.broadcast('newblock', block);
    }

    announceNewTransaction() {
        this.module.broadcast('newtransaction', transaction);
    }

    onNewBlock(cb) {
        this.module.listen('newblock', cb);
    }

    onNewTransaction(cb) {
        this.module.listen('newtransaction', cb);
    }
}


module.exports = Communications;
