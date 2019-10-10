const WSR = require('./jtWebSockRepeater');
const WSC = require('./jtWebSockClient');

async function test(){
    let result = null;
    let repeater = new WSR({portComm:5963});
    await repeater.init();
    let client = new WSC({portComm:5963});
    await client.init();
    await client.request('connect', 'module');
    await client.request('command');
    repeater.close();
}

test();