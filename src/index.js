const debug = require('debug')('kic:index');
const config = require('./config.json');
const BlockChain = require('./app/blockchain');
const Miner = require('./app/miner');
const Comm = require('./app/comm');
const crypto = require('./lib/crypto');
const range = require('lodash/range');

async function init() {
    const blockchain = new BlockChain(config.DB_ROOT);

    // const comm = new Comm();
    await blockchain.init();
    // await comm.init();

    debug(`Block size = ${blockchain.size}`);
    debug(`Pending transactions = ${blockchain.pendingTransactionCount}`);


    const miner = new Miner(blockchain);
    for(let i = 0; i < 15; i++) {
        try {
            await blockchain.addTransaction({id: crypto.randomId(64), data: {foo: `bar_${i}`}});
        } catch (err) {
            console.log(err);
        }
    }


    // comm.onNewBlock(block => {
    //     console.log('Recieved new block', block);
    // });

    // comm.announceNewBlock({mahamta: 'hgandi'});

    // const result = await miner.mine({
    //     lastBlock: blockhain.lastBlock,
    //     transactions: blockhain.getTransactions(),
    //     difficulty: blockhain.difficulty(blockhain.size)
    // });

    //console.log('result', blockchain);
}

init();
