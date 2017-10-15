const crypto = require('crypto');


function hash(buffer) {
    const str = typeof buffer == 'object' ? JSON.stringify(buffer) : buffer.toString();

    return crypto.createHash('sha256').update(str).digest('hex');
}


function randomId(size = 16) {
    return crypto.randomBytes(Math.floor(size / 2)).toString('hex');
}


module.exports = {hash, randomId};
