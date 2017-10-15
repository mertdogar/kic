const {spawn} = require('threads');
const range = require('lodash/range');
const config = require('../config.json');

function mineFunction(input, done) {
    const debug = require('debug')(`kic:miner-${input.name}`);
    const Block = require(input.__dirname + '/block');
    const block = new Block(input.blockPrototype);
    debug(`Starting miner ${input.name}`);
    debug(`Mine block ${block.index}`);
    debug(`Transaction count = ${block.transactions.length}`);

    const start = Date.now();
    do {
        block.timestamp = Date.now();
        block.nonce++;
        block.hash = Block.hash(block);
        // console.log(`difficulty: ${input.difficulty} >= ${block.difficulty} `);
    } while (input.difficulty <= block.difficulty);

    debug(`Block found: time = '${(Date.now() - start) / 1000} sec', dif = '${block.difficulty}', hash = '${block.hash}', nonce '${block.nonce}'`);
    done(block);
}

class Miner {
    constructor(blockchain, count = config.MINER_COUNT) {
        this.blockchain = blockchain;
        this.miners = [];
        this.count = count;
        this.mining = false;
        this.bindEvents();
    }

    async stop() {
        this.miners.forEach(miner => miner.kill());
        this.mining = false;
        this.miners = [];
    }

    async mine() {
        /* Stop existing workers */
        this.stop();

        this.mining = true;

        const lastBlock = this.blockchain.lastBlock;
        const difficulty = this.blockchain.difficulty(this.blockchain.lastBlock.index);
        const transactions = await this.blockchain.getPendingTransactions();

        this.blockPrototype = {
            index: lastBlock.index + 1,
            previousHash: lastBlock.hash,
            transactions: transactions
        };

        const minerPromises = range(this.count).map(index => {
            const miner = spawn(mineFunction);
            this.miners.push(miner);
            return miner
                .send({name: index, __dirname, blockPrototype: this.blockPrototype, difficulty})
                .promise();
        });

        return Promise.race(minerPromises)
            .then(response => {
                this.stop();
                return response
            })
            .catch(err => {
                this.stop();
                throw err;
            });
    }

    async onNewTransaction() {
        if (this.mining) return;
        if (this.blockchain.pendingTransactionCount < config.BLOCK_TRANSACTION_COUNT) return;
        const foundBlock = await this.mine();
        try {
            await this.blockchain.addBlock(foundBlock);
            console.log(`Added new block with id ${foundBlock.index} 🎉`);

            this.onNewTransaction();
        } catch (err) {
            console.log(`Block ${foundBlock.index} rehected 😱`, err, foundBlock);
        }
    }

    bindEvents() {
        this.blockchain.on('newtransaction',  () => this.onNewTransaction());

        this.blockchain.on('newblock', block => {
            if (!this.mining) return;

            console.log(`Existing mining failed. Somebody already published block ${block.index}.`);
            this.stop();

            this.onNewTransaction();
        });
    }
}

module.exports = Miner;

setInterval(_ => {

}, 1000);