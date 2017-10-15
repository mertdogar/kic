var levelup = require('levelup')
var leveldown = require('leveldown');



const db = levelup(leveldown('./blockchaindb'));

// db.put('snap', Math.random()).then(() => console.log('ok'))
// db.put('snap2', Math.random()).then(() => console.log('ok'))
// db.put('snap3', Math.random()).then(() => console.log('ok'))


const stream = db.createReadStream({ keys: true, values: true });
stream.on('data', function (data) {
        console.log('data=', data.key.toString(), data.value.toString())
    })
    stream.on('end', function() {
        console.log('bitik')
    })