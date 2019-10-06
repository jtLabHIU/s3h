const sleep = require('./jtSleep');

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

testFunc();