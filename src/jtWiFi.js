/**
 * @file synchronized WiFi manager
 *      jtWiFi.js
 * @module ./jtWiFi
 * @version 1.11.191004b
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 * 
 * ** IMPORTANT WARNING **
 * for Non-English Windows environment users:
 * `wifi-control` module isn't work well on non-english codepage.
 * please add `chcp 437 & ` into before `netsh`
 * of `node-modules/wifi-control/lib/win32.js` line 69 & 163
 * 
 */

const wifi  = require('wifi-control');
const arp = require('@network-utils/arp-lookup');
const sleep = require('./jtSleep');

/**
 * - Network:
 *  a pair of string to be connected by this manager
 * @typedef {object} Network
 * @property {string|null} ssid - SSID
 * @property {string|null} mac - MAC address
 * @property {string|null} ip - IP address
 */
/** 
 * - APList:
 *  the list of WiFi Access Points that available now
 * @typedef {object} APList
 * @property {boolean} success - scanForWiFi() successed
 * @property {number} numofap - number of APs
 * @property {Array<Network>} networks - array of network
 * @property {string} msg - result message
 */

 /**
 * - private static APList _aplist
 * @type {APList}
 */
let _aplist = {};

/**
 * - ConnectionState:
 *  the status about current WiFi connection
 * @typedef {object} ConnectionState
 * @property {boolean} success - getIfaceState() successed
 * @property {string} msg - result message
 * @property {Network} network - the network to be connected
 * @property {boolean} connected - the network was connected
 * @property {string} connection - status description
 * @property {boolean} power - WiFi manager turned on
 */

 /**
 * - private static ConnectionState _ifaceState
 * @type {ConnectionState}
 */
let _ifaceState = {};

/**
 * @classdesc synchronized WiFi manager
 */
class jtWiFi{
    /**
     * initialize fields
     * @constructor
     */
    constructor(){
        /**
         * debug flag
         * @type {boolean}
         */
        this._debug = true;

        /**
         * network watchdog
         * @type {object|null}
         */
        this._watchdog = null;

        /**
         * Access Point information
         * @type {APList}
         */
        this._aplist = _aplist;
        this._aplist = {
            success: false,
            numofap: 0,
            networks: [
                {
                    ssid: null,
                    mac: null,
                    ip: null
                }
            ],
            msg: 'before scan'
        };

        /**
         * WiFi interface information
         * @type {ConnectionState}
         */
        this._ifaceState = _ifaceState
        this._ifaceState = {
            success: false,
            msg: 'before connect',
            network: {
                ssid: null,
                mac: null
            },
            connected: false,
            connection: 'disconnected',
            power: false
        };
    }

    /**
     * WiFi network object
     * @readonly
     * @return {APList} - aplist
     */
    get aplist(){
        return this._aplist;
    }

    get connectionState(){
        return this._ifaceState;
    }

    /**
     * initialize WiFi connector and scan APs
     * @param {boolean} debug - debug mode
     * @return {number} - number of APs
     */
    async init(debug = true){
        this.debug = debug;
        wifi.init({
            debug: this._debug
        });

        return await this.scan();
    }

    /**
     * Promisenized wifi-control.scanForWiFi()
     */
    scanForWiFi_Promise(){
        return new Promise( (resolve, reject) => {
            return wifi.scanForWiFi( (err, response) => {
                if(err){
                    reject(err);
                    return;
                }
                resolve(response);
            });
        });
    }

    /**
     * Promisenized wifi-control.connectToAP()
     */
    connectToAP_Promise(ap){
        return new Promise( (resolve, reject) => {
            return wifi.connectToAP(ap, (err, response) => {
                if(err){
                    if(err.indexOf('confirmation timed out')<0){
                        reject(err);
                        return;
                    }
                }
                resolve(response);
            });
        });
    }

    /**
     * Promisenized wifi-control.resetWiFi()
     */
    resetWiFi_Promise(){
        return new Promise( (resolve, reject) => {
            return wifi.resetWiFi((err, response) => {
                if(err){
                    if(err.indexOf('confirmation timed out')<0){
                        reject(err);
                        return;
                    }
                }
                resolve(response);
            });
        });
    }

    /**
     * scan APs
     * @return {number} - number of APs
     */
    async scan(){
        let result = 0;
        let aplist = this._aplist;
        try{
            const response = await this.scanForWiFi_Promise();
            aplist.success = response.success;
            aplist.numofap = parseInt(response.msg.match(/\d+/));
            aplist.networks = response.networks;
            aplist.msg = response.msg;
            result = aplist.numofap;
        }catch(e){
            aplist.success = false;
            aplist.numofap = 0;
            aplist.networks = [];
            aplist.msg = e;
            if(this._debug){
                console.log(e);
            }
        }
        _aplist = aplist;
        return result;
    }

    /**
     * get Network object from SSID or MAC address
     * @param {string} ssidOrMac - SSID or MAC address
     * @return {Network|boolean} - the Network object if found
     */
    async lookup(ssidOrMac){
        let result = false;
        let source = '';
        this._aplist.networks.filter((item, index)=>{
            if(ssidOrMac.split(':').length == 6){
                source = item.mac;
            }else{
                source = item.ssid;
            }
            if(source.toUpperCase() == ssidOrMac.toUpperCase().trim()){
                result = item;
            }
        });
        return result;
    }

    /**
     * refresh to current connection status
     * @return {boolean} - one of state were changed
     */
    async refreshIfaceState(){
        let result = false;
        const state = wifi.getIfaceState();
        if(
            (state.success != this._ifaceState.success) ||
            (state.msg != this._ifaceState.msg) ||
            (state.ssid != this._ifaceState.network.ssid) ||
            (state.connection != this._ifaceState.connection) ||
            (state.power != this._ifaceState.power)
        ){
            result = true;
            this._ifaceState.success = state.success;
            this._ifaceState.msg = state.msg;
            this._ifaceState.network.ssid = state.ssid;
            this._ifaceState.connection = state.connection;
            this._ifaceState.power = state.power;

            if(state.connection == 'connected'){
                this._ifaceState.connected = true;
            }else{
                this._ifaceState.connected = false;
            }
            if(this._debug){
                console.log('refreshIfaceState: state change');
                console.log(this._ifaceState);
            }
        }
        return result;
    }

    /**
     * connect to AP and awake network watchdog
     * @param {Network} network - AP's SSID which try to connect
     */
    async connect(network){
        let result = false;
        const ap = {
            ssid: network.ssid
        }
        try{
            result = await this.connectToAP_Promise(ap);
            this._ifaceState.network = network;
            this._ifaceState.network.ip = await arp.toIP(network.mac);
            this.refreshIfaceState();
            this._watchdog = setInterval(() => this.refreshIfaceState(), 1000);
        }catch(e){
            if(this._debug){
                console.log('connect error:', e);
            }
        }
        return result;
    }

    async disconnect(){
        let result = false;
        try{
            clearInterval(this._watchdog);
            result = await this.resetWiFi_Promise();
            this.refreshIfaceState();
        }catch(e){
            if(this._debug){
                console.log('disconnect error:', e);
            }
        }
        return result;
    }
}

/*
async function test(){
    jtwifi = new jtWiFi();
    let count;
    if(count = await jtwifi.init()){
        console.log('ap:', count);
    }else{
        console.log('WiFi down...');
    }
    const network = await jtwifi.lookup('TELLO-D2D555');
    if(network){
        console.log('connect:', await jtwifi.connect(network));
        console.log(jtwifi.connectionState.network);
    }else{
        console.log('Tello not found');
    }

    while(jtwifi.connectionState.connected){
        console.log('running...');
        await sleep(1000);
    }
    jtwifi.disconnect();
}

test();
*/

module.exports = jtWiFi;