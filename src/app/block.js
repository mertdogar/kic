const crypto = require('../lib/crypto');
const Transaction = require('./transaction');
const pick = require('lodash/pick');
const isUndefined = require('lodash/isUndefined');

class Block {
    constructor({index, previousHash, timestamp = Date.now(), nonce = Math.round(Number.MAX_SAFE_INTEGER * Math.random()), transactions, hash}) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.nonce = nonce;
        this.transactions = transactions.map(t => new Transaction(t));
        this.hash = Block.hash(this);

        if (!isUndefined(hash) && this.hash != hash)
            throw new Error(`Block ${index} is not valid. ${this.hash} != ${hash}`);
    }

    static hash(block) {
        return crypto.hash(block.index + block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce);
    }

    static get Genesis() {
        return new Block({                        /* 14 Ekim 2017 */
            index: 0, previousHash: '', timestamp: 1508008753665, nonce: 18,
            transactions: [Transaction.Genesis],
            hash: '02eb466cf2d5654f3539e3bddafd663bea94c5490379038760c207ac323f17c2'
        });
    }

    get difficulty() {
        return parseInt(this.hash.substr(0, 14), 16);
    }

    toString() {
        try {
            return JSON.stringify(pick(this, [
                'index',
                'previousHash',
                'timestamp',
                'nonce',
                'transactions',
                'hash'
            ]));
        } catch (err) {
            throw new Error(`Could not stringify Block ${this.index}`);
        }
    }
}

module.exports = Block;