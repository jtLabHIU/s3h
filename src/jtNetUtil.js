/**
 * @file synchronized network utilities
 *      jtNetUtil.js
 * @module ./jtNetUtil
 * @version 1.20.200326a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019-2020 jtLab, Hokkaido Information University
 * 
 * @notice this module contains one or more methods for win32 only 
 * @ToDo this module will migrate to jtDevPortal, middle/lower layer
 * 
 * 
 */
/** */

const { syncExec } = require('./jtShell');
const sleep = require('./jtDevice/jtSleep');
const { logger } = require('./jtDebugConsole');
const EventEmitter = require('events').EventEmitter;
const os = require('os');

/**
 * NODE-PING
 * @type {ping}
 * @see https://www.npmjs.com/package/ping
 */
nodePing = require('ping');
/**
 * arp-lookup
 * @type {arp}
 * @see https://www.npmjs.com/package/@network-utils/arp-lookup
 */
arp = require('@network-utils/arp-lookup');


/**
 * NetMiddle - 
 *  middle layer(L3/L4) network interface object
 * @typedef {object} NetMiddle
 * @property {string} name - interface name
 * @property {string} protocol - L3 network protocol (internet)
 * @property {string} type - L3/L4 combined network protocol type (icmp/tcp/udp)
 * @property {string} family - L3 network family (ipv4/ipv6)
 * @property {string} address - L3 network address
 * @property {string} netmask - L3 subnet mask
 * @property {number} port - L4 port number
 * @property {string} mac - L2 address where is binded this interface to lower layer (MAC address, BD_ADDR, etc)
 */

/**
 * NetLower - 
 *  Lower layer(L1) network interface object
 * @typedef {object} NetLower
 * @property {string} name - interface name
 * @property {string} protocol - L1 network protocol (ethernet/wifi) Bluetooth PANs are also shown as ethernet
 * @property {string} type - L1 entwork interface type (adaptor/ap/wifista)
 * @property {string} mac - L2 address where is binded this interface to middle layer (MAC address, BD_ADDR, etc)
 */

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
     * @param {NetMiddle|string} param - typeof string: IP address
     */
    constructor(param){
        this._portal = {
            name: 'localhost',
            protocol: 'internet',
            type: 'icmp',
            family: 'ipv4',
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            port: 0,
            mac: '00:00:00:00:00:00'
        };
        if(param){
            if(typeof param === 'object' && param.hasOwnProperty('address')){
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
            result = await nodePing.promise.probe(
                this._portal.address, {
                    timeout: 0.5,
                    min_reply: 1
                }
            );
            count++;
        }
        if(count>1){
            logger.log('ping retry:', count);
        }
        return result.alive;
    }

    /**
     * start watchdog whether alive
     * @param {number} interval - watch interval (ms)
     * @returns {Promise}
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
        logger.log('jtNetUtils: watchdog stopped');
        this._watchdogTerminater = true;
    }

    /**
     * simple ping
     * @param {string} ip - IP address
     * @returns {Promise<boolean>}
     */
    async ping(ip = null){
        let result = false;
        if(ip){
            result = nodePing.promise.probe(ip, {
                timeout: 1,
                min_reply: 1
            });
        }
        return result;
    }

    /**
     * get middle layer network information
     * @returns {NetMiddle[]} - array of current middle layer network interfaces
     */
    getMiddleInterfaces(){
        const result = [];
        const interfaces = os.networkInterfaces();
        const lowerInterfaces = this.getLowerInterfaces();
        for(let interfaceName in interfaces){
            interfaces[interfaceName].forEach( param => {
                if(!param.internal){
                    result.push({
                        'name': interfaceName,
                        'protocol': 'internet',
                        'type': 'icmp',
                        'family': param.family.toLowerCase(),
                        'address': param.address,
                        'netmask': param.netmask,
                        'port': 0,
                        'mac': param.mac, 
                        'lower': this.getLowerInterfaces().find( element => element.name == interfaceName)
                    });
                }
            });
        }
        return result;
    }

    /**
     * get lower layer network information (win32 only)
     * @returns {NetLower[]} - array of current lower layer network interfaces
     */
    getLowerInterfaces(){
        const result = [];
        let stdout = null;
        let datum = {};
        if(os.platform() === 'win32'){
            // get all interfaces
            stdout = syncExec('ipconfig /all', {'decodePage': 932}).stdout.split('\r\n');
            for(let idx in stdout){
                const pos = stdout[idx].indexOf(':');
                const line = stdout[idx].trim();
                if(pos){
                    if(line && stdout[idx].charAt(0) !== ' '){
                        datum = {
                            name: '',
                            protocol: '',
                            type: 'adaptor',
                            mac: ''
                        };
                        if(line.indexOf('Ethernet') === 0){
                            datum.protocol = 'ethernet';
                        }else if(line.indexOf('Wireless') === 0){
                            datum.protocol = 'wifi';
                        }else{
                            datum.protocol = 'unknown';
                        }
                        datum.name = line.slice(line.indexOf('adapter') + 8, -1);
                    } else if(line.indexOf('Physical Address') === 0){
                        datum.mac = stdout[idx].substring(pos+1).trim().toLowerCase().replace(/-/g, ':');
                        result.push(datum);
                    }
                }
            }

            // get connection state
            stdout = syncExec('netsh interface ipv4 show interfaces').stdout.split('\r\n');
            for(let idx in stdout){
                const pos = stdout[idx].indexOf('connected');
                if(pos>0){
                    const name = stdout[idx].substring(pos+9).trim()
                    let state = true;
                    if(stdout[idx].indexOf('disconnected')>0){
                        state = false;
                    }
                    result.find(element => {
                        if(element.name == name){
                            element.connected = state;
                        }
                    });
                }
            }
        }
        return result;
    }

    getIP(){
        const result = {
            'address': [],
            'toString': ''
        };
        for(let element of this.getMiddleInterfaces()){
            result.address.push(element.address);
            if(result.toString.length){
                result.toString += " / ";
            }
            result.toString += `${element.address} (${element.lower.protocol})`; 
        }
        return result;
    }
}

/*
async function test(){
    const host = new jtNetUtil('192.168.10.1');
    host.event.on('dead', () => logger.log('dead.'));
    host.event.on('born', () => logger.log('born.'));
    host.startWatchdog();
    await sleep(50000);
    host.stopWatchdog(); 
    const util = new jtNetUtil();
    logger.log(util.getIPs);
    }

test();
logger.stop();
*/

module.exports = jtNetUtil;
