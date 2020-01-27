/**
 * @file synchronized network utilities
 *      jtNetUtil.js
 * @module ./jtNetUtil
 * @version 1.00.200124a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019-2020 jtLab, Hokkaido Information University
 * 
 * @ToDo this module will migrate to jtDevPortal, middle layer
 * 
 */

const { exec } = require('child_process');
const sleep = require('./jtDevice/jtSleep');

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
     * @example const host = new jtNetUtil({address:'192.168.10.1'});
     * 
     * @param {any} param
     */
    constructor(param = {address: '127.0.0.1'}){
        this._portal = {
            protocol: 'internet',
            type: 'icmp',
            family: 'ipv4',
            address: '127.0.0.1'
        };
        if(param.address){
            this._portal.address = param.address;
        }
    }

    /**
     * check the destination of this portal is alive or dead
     * 
     * @example const result = await host.isAlive();
     * 
     * @returns {Promise<boolean>} - returns true if alive
     */
    async isAlive(){
        const result = await ping.promise.probe(
            this._portal.address, {
                timeout: 0.01,
                min_reply: 1
            }
        );
        return result.alive;
    }

}

async function test(){
}

test();

module.exports = jtNetUtil;
