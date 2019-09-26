/*****************************
  jtSleep.js Ver 1.00.190926a
 *****************************/

function jtSleep(ms){
    return new Promise(resolve => {
        setTimeout( () => {
            resolve(true);
        }, ms);
    });
}

//usage: a sample in async function
async function jtSleepInAsyncFunctionSample(){
    console.log('0');
    await jtSleep(1000);
    console.log('1');
    await jtSleep(1000);
    console.log('2');
    await jtSleep(1000);
}

//usage: a sample with Promise
function jtSleepWithPromiseSample(){
    console.log('3');
    jtSleep(1000)
    .then( () => {
        console.log('4');
        return jtSleep(1000);
    }).then( () => {
        console.log('5');
        return jtSleep(1000);
    });
}

//jtSleepInAsyncFunctionSample();
//jtSleepWithPromiseSample();

module.exports = jtSleep;