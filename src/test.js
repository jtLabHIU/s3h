const WSR = require('./jtWebSockRepeater');
const WSC = require('./jtWebSockClient');

async function testFunc(){
    let resultPromise;
    let count = 0;
    return new Promise( (resolve, reject) => {
        resultPromise = setInterval( async () => {
            console.log('runnning...', count++);
            await sleep(3000);
        }, 1000);
    }).then( result => {
        clearInterval(resultPromise);
        return result;
    }).catch( (e) => {
        console.log(e);
    });
}

async function test(){
    let result = null;
    let repeater = new WSR({portComm:5963});
    await repeater.init();
    let client = new WSC({portComm:5963});
    await client.init();
    await client.request('1:module:connect');
}

test();