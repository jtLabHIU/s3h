/**
 * @file synchronous sleep and wait function
 *      jtSleep.js
 * @module ./jtSleep
 * @version 2.00.191007a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

 /**
  * synchronous sleep
  * @param {Number} ms - sleep time (milliseconds)
  */
function jtSleep(ms){
    return new Promise(resolve => {
        setTimeout( () => {
            resolve(true);
        }, ms);
    });
}

/**
 * synchronous wait
 * @param {number} timeout - wait timeout (milliseconds) 
 * @param {number} interval - condition check interval (milliseconds)
 * @param {Function} funcCondition - conditional expression (async function)
 * @param {Function} funcOnTimeout - call on timeout (async function)
 * @returns {boolean} - true: wait successed  false: timeout
 */
async function jtWait(
    timeout = 5000,
    interval = 10,
    funcCondition = true,
    funcOnTimeout = {}
){
    let timer = timeout;
    let watchdog = null;
    return new Promise( (resolve) => {
        watchdog = setInterval( () => {
            const condition = await funcCondition();
            if(condition){
                resolve(true);
            }
            timer = timer - interval;
            if(timer<0){
                await funcOnTimeout();
                resolve(false);
            }
        }, interval);
    }).then( (result) => {
        clearInterval(watchdog);
        return result;
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
module.exports.wait = jtWait;