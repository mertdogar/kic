const crypto = require('../lib/crypto');
const pick = require('lodash/pick');
const isUndefined = require('lodash/isUndefined');

class Transaction {
    constructor({id, hash, data}) {
        this.id = id;
        this.data = data;
        this.hash = Transaction.hash(this);

        if (!isUndefined(hash) && this.hash != hash)
            throw new Error(`Transaction ${id} is not valid. ${this.hash} != ${hash}, data = ${data}`);
    }

    static hash (transaction) {
        return crypto.hash(transaction.id + JSON.stringify(transaction.data));
    }

    static get Genesis() {
        return new Transaction({
            id: 'c5uD4wvXSE8XY8AVdGFJWXYKaKTBzMDuELScGDSddx777aSA9DeB2y4dkuvTttMB',
            data: 'A'
        });
    }

    toString() {
        try {
            return JSON.stringify(this);
        } catch (err) {
            throw new Error(`Could not stringify Transaction ${this.id}`);
        }
    }

    toJSON() {
        return pick(this, ['id', 'data', 'hash']);
    }
}


module.exports = Transaction;