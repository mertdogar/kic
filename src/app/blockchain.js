const debug = require('debug')('kic:blockchain');
const EventEmitterExtra = require('event-emitter-extra');
const Block = require('./block');
const Transaction = require('./transaction');
const TransactionDB = require('./transactiondb');
const BlockDB = require('./blockdb');
const Miner = require('./miner');
const path = require('path');
const util = require('util');
const mkdirp = util.promisify(require('mkdirp'));
const config = require('../config.json');


class BlockChain extends EventEmitterExtra {
    constructor (dbPath) {
        super();
        this.dbPath = dbPath;
    }

    get size() {
        return this.blockDB.size;
    }

    get(index) {
        return this.blockDB.get(index);
    }

    getTransactions() {
        return [Transaction.Genesis];
    }

    difficulty(index) {
        return Math.max(
            Math.floor(
                Number.MAX_SAFE_INTEGER / Math.pow(
                    Math.floor(((index || this.size) + 20) / 5) + 1
                    , 5)
            )
        , 0);
    }

    async init() {
        await mkdirp(path.join(this.dbPath, 'blocks'));
        await mkdirp(path.join(this.dbPath, 'transactions'));
        this.blockDB = new BlockDB(path.join(this.dbPath, 'blocks'));
        this.transactionDB = new TransactionDB(path.join(this.dbPath, 'transactions'));

        await this.blockDB.init();
        await this.transactionDB.init();

        if (this.size == 0) {
            debug('Adding genesis block...');
            await this.blockDB.insert(Block.Genesis);
        }

        //TO-DO: Prune transaction db?

        this.lastBlock = await this.blockDB.get(this.size - 1);
    }

    async addBlock(raw) {
        const lastBlock = this.lastBlock;
        console.log('add compare', lastBlock, raw);
        const newBlock = new Block(raw);

        if (!raw.hash)
            throw new Error(`Block ${newBlock.index}'s hash is missing.`);

        if (newBlock.index != this.size)
            throw new Error(`Block insert failed. Block index ${newBlock.index} != ${this.size}`);

        if (newBlock.previousHash != lastBlock.hash)
            throw new Error(`Block insert faild. Block-${newBlock.index}'s previous hash do not match.`);

        if (newBlock.difficulty >= this.difficulty(newBlock.index))
            throw new Error(`Block insert failed. Block-${newBlock.id}'s hash is invalid.`);


        const duplicateTransactions = await this.blockDB.some(block => {
            return newBlock.transactions.some(newT => {
                return block.transactions.some(t => t.id == newT.id);
            });
        });

        if (duplicateTransactions)
            throw new Error(`Block insert failed. Block-${newBlock.id} has duplicate transactions.`);

        /* Block is Legit from now on*/
        debug(`Adding block ${newBlock.index}`);
        await this.blockDB.insert(newBlock);
        await this.transactionDB.remove(newBlock.transactions.map(t => t.id));

        this.lastBlock = newBlock;

        this.emit('newblock', newBlock);
    }

    async addTransaction(raw) {
        const newTransaction = new Transaction(raw);

        if (this.transactionDB.hashes[newTransaction.hash])
            throw new Error(`Transaction insert failed. Trans-${newTransaction.id} is already in pool`);

        const duplicateTransaction = await this.blockDB.some(block => {
            return block.transactions.some(t => t.id == newTransaction.id);
        });

        if (duplicateTransaction)
            throw new Error(`Transaction insert failed. Trans-${newTransaction.id} is already in blockchain`);

        debug(`Adding transaction ${newTransaction.id}`);
        await this.transactionDB.insert(newTransaction);

        this.emit('newtransaction', newTransaction);
    }

    get pendingTransactionCount() {
        return Object.keys(this.transactionDB.hashes).length;
    }

    async getPendingTransactions() {
        return this.transactionDB.getAll(config.BLOCK_TRANSACTION_COUNT);
    }
}

module.exports = BlockChain;