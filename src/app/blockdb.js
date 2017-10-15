const levelup = require('levelup');
const leveldown = require('leveldown');
const map = require('lodash/map');
const omitBy = require('lodash/omitBy');
const Block = require('./block');


class BlockDB {
    constructor (path) {
        this.db = levelup(leveldown(path));
        this.hashes = {};
    }

    get size() {
        return Object.keys(this.hashes).length;
    }

    async init() {
        const stream = this.db.createReadStream({keys: true, values: true, fillCache: true});

        return new Promise((resolve, reject) => {
            stream.on('data', ({key, value}) => {
                try {
                    const block = JSON.parse(value.toString());
                    this.hashes[block.hash] = key.toString();
                } catch (err) {
                    stream.destroy();
                    reject(err);
                }
            });

            stream.on('error', reject);
            stream.on('end', resolve);
        });
    }

    async getByIndex (index) {
        const raw = await this.db.get(index);

        try {
            const blockData = JSON.parse(raw);
            return new Block(blockData);
        } catch (err) {
            throw new Error(`Could not parse data of block ${index}`);
        }
    }

    getByHash (hash) {
        if (!this.hashes[hash])
            throw new Error(`Hash ${hash} is not in blockdb`);

        return this.getByIndex(this.hashes[hash]);
    }

    get (indexOrHash) {
        if (isNaN(Number(indexOrHash)))
            return this.getByHash(indexOrHash)
        else
            return this.getByIndex(indexOrHash);
    }

    some(cb) {
        const stream = this.db.createReadStream({keys: true, values: true, fillCache: true});

        return new Promise((resolve, reject) => {
            stream.on('data', ({key, value}) => {
                try {
                    const block = JSON.parse(value.toString());
                    const result = cb(block);

                    if (result) {
                        stream.destroy();
                        resolve(true);
                    }
                } catch (err) {
                    stream.destroy();
                    reject(err);
                }
            });

            stream.on('error', reject);
            stream.on('end', () => resolve(false));
        });
    }

    async getAll(limit = -1) {
        const stream = this.db.createReadStream({keys: true, values: true, fillCache: true, limit});
        const blocks = [];

        return new Promise((resolve, reject) => {
            stream.on('data', ({key, value}) => {
                try {
                    const block = JSON.parse(value.toString());
                    blocks.push(block);
                } catch (err) {
                    stream.destroy();
                    reject(err);
                }
            });

            stream.on('error', reject);
            stream.on('end', () => resolve(blocks));
        });
    }

    async insert (block) {
        if (!(block instanceof Block))
            throw new Error(`Insertion refused. Can insert only Block instances`);

        try {
            await this.db.put(block.index, block);
            this.hashes[block.hash] = block.index;
        } catch (err) {
            throw new Error(`Insertaion failed. Block ${block.index}`);
        }
    }

    async remove (indexes) {
        if (!Array.isArray(indexes)) indexes = [indexes];

        const ops = indexes.map(index => ({type: 'del', key: index}));
        await this.db.batch(ops);
        this.hashes = omitBy(this.hashes, (index, hash) => indexes.indexOf(index) != -1);
    }

    async removeAll () {
        return this.remove(map(this.hashes));
    }
}


module.exports = BlockDB;
