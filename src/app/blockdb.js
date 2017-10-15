const levelup = require('levelup');
const leveldown = require('leveldown');
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
}


module.exports = BlockDB;
