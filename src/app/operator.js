const CommModule = require('../lib/comm-line');
const debug = require('debug')('kic:operator');
const Async = require('async-q');
const BlockChain = require('./blockchain');
const _ = require('lodash');

class Operator {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.comm = new CommModule();
    }

    async init() {
        await this.comm.init();
        this.bindEvents();

        const blockchains = await this.getBlockChains();
        const bestChain = _.chain(blockchains)
            .filter('verified')
            .sort('chainlength')
            .last()
            .value();

        console.log('Peer chains', blockchains.map(({chainlength, verified}) => ({chainlength, verified})));

        if (bestChain && bestChain.chainlength > this.blockchain.size) {
            debug(`Replacing blockchain with something with length ${bestChain.chainlength}`);

            await this.blockchain.resetBlocks();
            for (let i = 1; i < bestChain.chainlength; i++)
                await this.blockchain.addBlock(bestChain.blocks[i]);
        }

        await this.comm.broadcast('newblockchain', await this.blockchain.toJSONAsync());

        const transactions = await this.getTransactions();

        await Async.eachSeries(transactions, t => {
            return this.blockchain.addTransaction(t).catch(err => {/* Silence */});
        });

        await this.comm.broadcast('synctransactions', await this.blockchain.getPendingTransactions(-1));
    }


    async getBlockChains() {
        const peerIds = await this.comm.getPeers();

        const blockchains = (await Async.mapLimit(peerIds, 3, peerId => {
            return this.comm.askPeer(peerId, 'getblockchain')
                .catch(err => {
                    debug(`Error fetching block chain of peer ${peerId}`, err);
                });
        }))
        .filter(x => x)
        .map(raw => BlockChain.verifyBlockChain(raw));

        return blockchains;
    }

    async getTransactions() {
        const peerIds = await this.comm.getPeers();

        const peerTransactions = (await Async.mapLimit(peerIds, 3, peerId => {
            return this.comm.askPeer(peerId, 'gettransactions')
                .catch(err => {
                    debug(`Error fetching block chain of peer ${peerId}`, err);
                });
        }))
        .filter(x => x); //[[t1, t2], [t1, t2, t3]]

        const transactions = _.chain(peerTransactions)
            .flatten()
            .uniqBy('id')
            .value();

        return transactions;
    }

    bindEvents() {
        this.blockchain.on('newblock', block => this.comm.broadcast('newblock', block));
        this.blockchain.on('newtransaction', t => this.comm.broadcast('newtransaction', t));

        this.comm.on('newblockchain', async (blockChainData) => {
            const {chainlength, blocks, verified} = BlockChain.verifyBlockChain(blockChainData);
            if (!verified) return;

            if (chainlength > this.blockchain.size) {
                debug(`Replacing blockchain with something with length ${chainlength}`);

                await this.blockchain.resetBlocks();
                for (let i = 1; i < chainlength; i++)
                    await this.blockchain.addBlock(blocks[i]);
            }
        });

        this.comm.on('synctransactions', async (transactions) => {
            for (let i = 0; i < transactions.length; i++)
                await this.blockchain.addTransaction(transactions[i]).catch(err => {/* Silence */});
        });

        this.comm.on('newblock', blockData => {
            this.blockchain.addBlock(blockData).catch(err => {/* Silence */});
        });

        this.comm.on('newtransaction', tData => {
            this.blockchain.addTransaction(tData).catch(err => {/* Silence */});
        });

        this.comm.onPeerMessage(async ({peerId, data}, done) => {
            if (data == 'getblockchain') {
                return done(null, await this.blockchain.toJSONAsync());
            } else if (data == 'gettransactions') {
                return done(null, await this.blockchain.getPendingTransactions(-1));
            } else {
                console.log(`Unknown peer message type ${data} from ${peerId}`)
                return done(new Error('Unknown command'));
            }
        });
    }
}

module.exports = Operator;
