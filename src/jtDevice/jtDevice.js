/**
 * @file Super class of all jtDevices
 *      jtDevice.js
 * @module ./jtDevice/jtDevice
 * @version 0.00.191021a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

const uuidv4 = require('uuid/v4');
const sleep = require('./jtSleep');
const _uuid = uuidv4();
const _devices = [];

class jtDevice{
    constructor(devType = '', argv = {}){
        this._uuid = uuidv4();
        this._devType = devType;
        if(argv){

        }
        _devices.push(this);
    }

    async init(argv = {}){
        return false;
    }

    /**
     * - get UUID of this host
     * @static
     * @returns {string} UUID of this host
     */
    static get uuid(){
        return _uuid;
    }

    /**
     * - get UUID of this device
     * @return {string} UUID if this device
     */
    get uuid(){
        return this._uuid;
    }

    static get devices(){
        return _devices;
    }

    static getDeviceByUUID(uuid = null){
        let result = null;
        if(uuid){
            const devices = _devices.filter( element => element.uuid == uuid);
            if(devices.length){
                result = devices[0];
            }
        }
        return result;
    }

    //
    // constants for access control
    //
    /** 
     * @typedef  {number} NETAREA
     */
    /** @returns {NETAREA} 0 - network access: unlimited */ 
    static get NETAREA_ALL() { return 0 }
    /** @returns {NETAREA} 1 - network access: jtDevServ/Master only */ 
    static get NETAREA_DEVSERV(){ return 1 }
    /** @returns {2} 2 - network access: jtDevServ/Master and its client only */ 
    static get NETAREA_DEVCLIENT(){ return 2 }
    /** @returns {4} 4 - network access: localhost only */ 
    static get NETAREA_LOCALHOST(){ return 4 }
    /** @returns {5} 5 - network access: within own subnet/24 only */ 
    static get NETAREA_SUBNET24(){ return 5 }
    /** @returns {6} 6 - network access: allowed hosts only */ 
    static get NETAREA_ALLOWED(){ return 6 }
    /** @returns {7} 7 - network access: via jtDevMaster proxy */ 
    static get NETAREA_PROXY(){ return 7 }
}

/**
 * - objct transfer: restrict to define custom properties in constructor
 * @type {NETAREA}
 */
jtDevice._objtrans_construct   = jtDevice.NETAREA_DEVCLIENT;
/**
 * - objct transfer: restrict stringify of own object
 * @type {NETAREA}
 */
jtDevice._objtrans_stringify   = jtDevice.NETAREA_DEVCLIENT;
/**
 * - objct transfer: restrict functionify to JSON Function object
 * @type {NETAREA}
 */
jtDevice._objtrans_functionify = jtDevice.NETAREA_DEVSERV;

/**
 * - all devices of this host
 * @type {jtDevice}
 */
jtDevice._devices = _devices;

/**
 * - sync/async sleep function (from jtSleep.js)
  * @param {Number} ms - sleep time (milliseconds)
 */
jtDevice.sleep = sleep;
/**
 * - sync/async wait function (from jtSleep.js)
 * @param {number} timeout - wait timeout (milliseconds) if 0, wait terminate condition
 * @param {number} interval - condition check interval (milliseconds)
 * @param {Function} funcCondition - conditional expression (resolver function)
 * @param {Function} funcTerminate - call on timeout or terminater (resolver function)
 * @returns {Promise<boolean>} - true: wait successed  - false: timeout or force terminated
 */
jtDevice.wait = sleep.waitPromise

module.exports = jtDevice;