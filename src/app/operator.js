const Comm = require('./comm');
const BlockChain = require('./blockchain');
const Transaction = require('./transaction');
const TransactionDB = require('./transactiondb');

class Operator {
    constructor() {
        this.blockchain = new BlockChain('kic-db');
        this.comm = new Comm();
        this.transactionDB = new TransactionDB();
    }

    async init() {
        await this.comm.init();
        await this.blockchain.init();

        this.bindEvents();
    }

    bindEvents() {
        this.blockchain.on('newblock', block => {
            this.comm.announceNewBlock(block);
            //kill miners?
        });

        comm.onNewBlock(blockData => this.blockchain.addBlock(blockData));

        this.blockchain.on('newtransaction', t => this.comm.announceNewBlock(block));

        comm.onNewTransaction(tData => this.blockchain.addTransaction(tData));
    }
}

module.exports = Operator;
