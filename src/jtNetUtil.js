/**
 * @file synchronized network utilities
 *      jtNetUtil.js
 * @module ./jtNetUtil
 * @version 1.01.200220c
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019-2020 jtLab, Hokkaido Information University
 * 
 * @ToDo this module will migrate to jtDevPortal, middle layer
 * 
 */

const { syncExec } = require('./jtShell');
const sleep = require('./jtDevice/jtSleep');
const EventEmitter = require('events').EventEmitter;

/**
 * NODE-PING
 * @type {ping}
 * @see https://www.npmjs.com/package/ping
 */
ping = require('ping');
/**
 * arp-lookup
 * @type {arp}
 * @see https://www.npmjs.com/package/@network-utils/arp-lookup
 */
arp = require('@network-utils/arp-lookup');


/**
 * @classdesc network host util
 */
class jtNetUtil{
    /**
     * initialize fields
     * @constructor
     * 
     * @example const host = new jtNetUtil('192.168.10.1');
     * 
     * @param {string|Portal} param - typeof string: IP address
     */
    constructor(param = '127.0.0.1'){
        this._portal = {
            protocol: 'internet',
            type: 'icmp',
            family: 'ipv4',
            address: '127.0.0.1'
        };
        if(param){
            if(typeof param === 'object' && param.address){
                this._portal.address = param.address;
            }else{
                this._portal.address = param;
            }
        }

        this.event = new EventEmitter();

        this._watchdogTerminater = true;
    }

    /**
     * check the destination of this portal is alive or dead
     * 
     * @example const result = await host.isAlive();
     * 
     * @returns {number} retry - retry this times when ping is failed
     * @returns {Promise<boolean>} - returns true if alive
     */
    async isAlive(retry = 6){
        let result = {alive:false};
        let count = 0;
        while(count == 0 || (!result.alive && count < retry && !this._watchdogTerminater)){
            result = await ping.promise.probe(
                this._portal.address, {
                    timeout: 0.5,
                    min_reply: 1
                }
            );
            count++;
        }
        if(count>1){
            console.log('ping retry:', count);
        }
        return result.alive;
    }

    /**
     * start watchdog whether alive
     * @param {number} interval - watch interval (ms)
     */
    async startWatchdog(interval = 1000){
        let lastResult = null;
        let watchdog = null;
        let watchdogIsAlive = false;
        this._watchdogTerminater = false;

        const promise = new Promise( (resolve) => {
            watchdog = setInterval( async () => {
                if(!watchdogIsAlive){
                    watchdogIsAlive = true;
                    const result = await this.isAlive();
                    if(result !== lastResult){
                        if(result){
                            this.event.emit('born');
                        }else{
                            this.event.emit('dead');
                        }
                    }
                    lastResult = result;
                    watchdogIsAlive = false;
                    if(this._watchdogTerminater){
                        resolve(true);
                    }
                }
            }, interval);
        }).then( () => {
            clearInterval(watchdog);
        });
    }

    /**
     * stop watchdog
     */
    stopWatchdog(){
        console.log('jtNetUtils: watchdog stopped');
        this._watchdogTerminater = true;
    }

}

/*
async function test(){
    const host = new jtNetUtil('192.168.10.1');
    host.event.on('dead', () => console.log('dead.'));
    host.event.on('born', () => console.log('born.'));
    host.startWatchdog();
    await sleep(50000);
    host.stopWatchdog();
}

test();
*/

module.exports = jtNetUtil;
