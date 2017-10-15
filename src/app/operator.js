const CommModule = require('../lib/comm-line');
const debug = require('debug')('kic:operator');
const Async = require('async-q');
const BlockChain = require('./blockchain');

class Operator {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.comm = new CommModule();
    }

    async init() {
        await this.comm.init();
        this.bindEvents();

        const blockchains = await this.getBlockChains();
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

    bindEvents() {
        this.blockchain.on('newblock', block => this.comm.broadcast('newblock', block));
        this.blockchain.on('newtransaction', t => this.comm.broadcast('newtransaction', t));

        this.comm.on('newblock', blockData => {
            this.blockchain.addBlock(blockData).catch(err => {/* Silence */});
        });

        this.comm.on('newtransaction', tData => {
            this.blockchain.addTransaction(tData).catch(err => {/* Silence */});
        });

        this.comm.onPeerMessage(async ({peerId, data}, done) => {
            if (data == 'getblockchain') {
                return done(null, await this.blockchain.toJSONAsync());
            } else {
                console.log(`Unknown peer message type ${data} from ${peerId}`)
                return done(new Error('Unknown command'));
            }
        });
    }
}

module.exports = Operator;
