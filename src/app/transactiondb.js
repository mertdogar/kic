const levelup = require('levelup');
const leveldown = require('leveldown');
const Transaction = require('./transaction');
const omitBy = require('lodash/omitBy');


class TransactionDB {
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
                    const transaction = JSON.parse(value.toString());
                    this.hashes[transaction.hash] = key.toString();
                } catch (err) {
                    stream.destroy();
                    reject(err);
                }
            });

            stream.on('error', reject);
            stream.on('end', resolve);
        });
    }

    async getById (id) {
        const raw = await this.db.get(id);

        try {
            const transactionData = JSON.parse(raw);
            return new Transaction(transactionData);
        } catch (err) {
            throw new Error(`Could not parse data of transaction ${id}`);
        }
    }

    getByHash (hash) {
        if (!this.hashes[hash])
            throw new Error(`Hash ${hash} is not in transactionDB`);

        return this.getById(this.hashes[hash]);
    }

    get ({id, hash}) {
        if (id) return this.getById(id);
        if (hash) return this.getByHash(hash);

        throw new Error('Id or Hash must be supplied to fetch a transaction from db');
    }

    getAll (limit = -1) {
        const stream = this.db.createReadStream({keys: true, values: true, fillCache: true, limit});
        const transactions = [];

        return new Promise((resolve, reject) => {
            stream.on('data', ({key, value}) => {
                try {
                    const transaction = JSON.parse(value.toString());
                    transactions.push(transaction);
                } catch (err) {
                    stream.destroy();
                    reject(err);
                }
            });

            stream.on('error', reject);
            stream.on('end', () => resolve(transactions));
        });
    }

    async insert (transaction) {
        if (!(transaction instanceof Transaction))
            throw new Error(`Insertion refused. Can insert only Transaction instances`);

        try {
            await this.db.put(transaction.id, transaction);
            this.hashes[transaction.hash] = transaction.id;
        } catch (err) {
            throw new Error(`Insertaion failed. Transaction ${transaction.id}`);
        }
    }

    async remove (ids) {
        if (!Array.isArray(ids)) ids = [ids];

        const ops = ids.map(id => ({type: 'del', key: id}));
        await this.db.batch(ops);
        this.hashes = omitBy(this.hashes, (id, hash) => ids.indexOf(id) != -1);
    }
}


module.exports = TransactionDB;
