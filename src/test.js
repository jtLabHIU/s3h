const WSR = require('./jtWebSockRepeater');
const WSC = require('./jtWebSockClient');
const tello = require('./jtTello');

async function test(){
    let result = null;
    let repeater = new WSR({portComm:5963});
    await repeater.init();

    let client = new WSC({portComm:5963});
    await client.init();
    await client.request('connect', 'module');
    await client.request('command');
    await client.request('battery?');
    await client.request('sdk?');
    await client.request('takeoff');
    await client.request('flip f');
    await client.request('land');
    repeater.close();
}

test();