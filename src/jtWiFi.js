/**
 * @file synchronized WiFi manager
 *      jtWiFi.js
 * @module ./jtWiFi
 * @version 1.60.200310a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019-2020 jtLab, Hokkaido Information University
 * 
 * ** IMPORTANT WARNING **
 * for Non-English Windows environment users:
 * modules that using Windows command aren't work well on non-english codepage.
 * please change to `execSyncToBuffer = require('../../../src/jtShell').syncExec;`
 * of `node-modules/wifi-control/lib/wifi-control.js` line 7
 * please change to `fs = require('../../../src/jtShell');`
 * of `node-modules/wifi-control/lib/win32.js` line 5
 * please change to `const child_process_1 = require("../../../../src/jtShell");`
 * of `node-modules/@network-utils/arp-lookup/dist/index.js` line 11
 * 
 */

const wifi  = require('wifi-control');
const arp = require('@network-utils/arp-lookup');
const shell = require('./jtShell');
const sleep = require('./jtDevice/jtSleep');
const NetUtil = require('./jtNetUtil');
const iconv = require('iconv-lite');
const { logger } = require('./jtDebugConsole');
const EventEmitter = require('events').EventEmitter;

const scanner = '\\asset\\WlanScan.exe';

/**
 * - Network:
 *  target device to be connected by this manager
 * @typedef {object} Network
 * @property {string|null} ssid - SSID
 * @property {string|undefined} password - password
 * @property {string|null} mac - MAC address
 * @property {string|null} ip - IP address
 * @property {Portal|null} host - instance of network portal 
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
    constructor(appPath = null){
        /**
         * path to app
         * @type {string}
         */
        this._appPath = '.'
        if(appPath){
            this._appPath = appPath;
        }

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
                    ip: null,
                    host: null
                }
            ],
            msg: 'not scanned yet'
        };

        /**
         * WiFi interface information
         * @type {ConnectionState}
         */
        this._ifaceState = _ifaceState
        this._ifaceState = {
            success: false,
            msg: 'not connected yet',
            network: {
                ssid: null,
                mac: null,
                ip: null,
                host: null
            },
            connected: false,
            connection: 'disconnected',
            power: false
        };

        /**
         * the AP as network infrastructure
         * @type {Network|null}
         */
        this._infraAP = null;

        this.event = new EventEmitter;
    }

    /**
     * WiFi network object
     * @readonly
     * @returns {APList} - aplist
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
     * @returns {number} - number of APs
     */
    async init(debug = true){
        this._debug = debug;
        wifi.init({
            debug: this._debug
        });
        const result = await this.scan();

        const state = wifi.getIfaceState();
        if(state.connection === 'connected'){
            this._infraAP = await this.getPassword({
                ssid: state.ssid,
                mac: (await this.lookup(state.ssid)).mac,
                ip: null
            });
        }

        return result;
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
            const cwd = shell.cwd();
            shell.cwd(shell.temp());
            return wifi.connectToAP(ap, (err, response) => {
                if(err && err.stderr){
                    logger.log('connectToAP_Promise:',typeof err, err)
                    if(err.stderr.indexOf('confirmation timed out')<0){
                        reject(err);
                        return;
                    }
                }
                shell.cwd(cwd);
                logger.log('writeback:', cwd);
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
                if(err && err.stderr){
                    logger.log('resetWiFi_Promise:',typeof err, err)
                    if(err.stderr.indexOf('confirmation timed out')<0){
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
     * @returns {number} - number of APs
     */
    async scan(){
        let result = 0;
        let aplist = this._aplist;
        try{
            if(shell.isWin32()){
                var response = shell.syncExec(this._appPath + scanner);
                if(response.stderr){
                    logger.log('wifi.scan() error:', this._appPath + scanner, response.status, response.stderr);
                }
            }
            response = await this.scanForWiFi_Promise();
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
                logger.log(e);
            }
        }
        _aplist = aplist;
        return result;
    }

    /**
     * search the AP from this._apilist by SSID
     * @param {string} ssid - SSID which is search for
     * @returns {boolean} - search result
     */
    async search(ssid = null){
        let result = false;
        await this._aplist.networks.filter( (value, index, array) => {
            if(value.ssid === ssid){
                result = true;
            }
        });
        return result;
    }
    
    /**
     * get Network object from SSID or MAC address
     * @param {string} ssidOrMac - SSID or MAC address
     * @returns {Network|boolean} - the Network object if found
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
     * @returns {boolean} - one of state were changed
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
                if(!this._ifaceState.connected){
                    this._ifaceState.connected = true;
                    this.event.emit('connected');
                }
            }else{
                if(this._ifaceState.connected){
                    this._ifaceState.connected = false;
                    this.event.emit('disconnected');
                }
            }
            if(this._debug){
                logger.log('refreshIfaceState: state change');
            }
        }
        return result;
    }

    /**
     * returns true if this module connected to infrastructure AP
     * @returns {boolean}
     */
    isConnectedToInfraAP(){
        let result = false;
        if(this.connectionState.connected && this._infraAP && this.connectionState.network.ssid == this._infraAP.ssid){
            result = true;
        }
        return result;
    }

    /**
     * connect to infrastructure AP simply
     */
    async connectToInfraAP(){
        if(!this.isConnectedToInfraAP() && this._infraAP){
            if(this.connectionState.connected){
                await this.disconnect();
            }
            await this.scan();
            if(shell.isWin32()){
                shell.execSync('netsh wlan connect name="' + this._infraAP.ssid + '"');
                this.refreshIfaceState();
            }else{
                await this.connect();
            }
        }
    }

    /**
     * connect to AP and awake network watchdog
     * @param {Network} network - AP's SSID which try to connect, default:_infraAP
     * @param {string} target - The IP address which host is watch from watchdog
     * @returns {wifi-control.response|boolean} - false:error 
     */
    async connect(network = this._infraAP, target = null){
        let result = false;
        if(network){
            const ap = {
                ssid: network.ssid
            }
            if(network.password !== undefined){
                ap.password = network.password;
            }
            if(this.connectionState.connected){
                if(this._debug){
                    logger.log('WiFi is already connected to', this.connectionState.network.ssid);
                }
            }else{
                try{
                    result = await this.connectToAP_Promise(ap);
                    logger.log('jtWifi:connect:result', result);
                    if(result.success){
                        this._ifaceState.network = network;
                        await arp.getTable();
                        this._ifaceState.network.ip = await arp.toIP(network.mac);
                        logger.log('debug: ', this._ifaceState.network.ip);
                        // use default target IP when arp lookup from MAC address was failed
                        if(!this._ifaceState.network.ip){
                            if(new NetUtil().ping(target)){
                                this._ifaceState.network.ip = target;
                                result.success = true;
                                result.msg = 'connect successfully but arp lookup failed';
                            }else{
                                result.success = false;
                                result.msg = 'connected but host not found';
                            }
                        }
                        // start watchdog
                        if(result.success){
                            logger.log('jtWiFi:startWatchdog: success');
                            this._ifaceState.network.host = new NetUtil(this._ifaceState.network.ip);
                            this._ifaceState.network.host.event.on('dead', () => {
                                this.disconnect();
                            });
                            this._ifaceState.network.host.startWatchdog();
                            this.refreshIfaceState();
                            this._watchdog = setInterval(() => this.refreshIfaceState(), 1000);
                        }
                    }
                }catch(e){
                    //if(this._debug){
                        logger.log('connect error:', e);
                    //}
                }
            }
        }
        return result;
    }

    /**
     * disconnect from current AP and recall network watchdog
     * @returns {wifi-control.response|boolean} - false:error 
     */
    async disconnect(){
        let result = false;
        try{
            this.stop();
            result = await this.resetWiFi_Promise();
            this.refreshIfaceState();
            logger.log('WiFi disconnected.');
        }catch(e){
            if(this._debug){
                logger.log('disconnect error:', e);
            }
        }
        return result;
    }

    /**
     * stop watchdogs
     */
    stop(){
        try{
            this._ifaceState.network.host.stopWatchdog();
        } catch(e){}
        if(this._watchdog){
            clearInterval(this._watchdog);
        }
    }

    /**
     * get Wi-Fi password from network profiles to Network object
     * 
     * @param {Network} network - target network
     * @returns {Network} - network.password added if success to get password
     * 
     * @notice works on win32 only
     */
    async getPassword(network = {ssid:null}){
        let result = network;
        if(shell.isWin32() && network.ssid){
            const command = `netsh wlan show profiles name="${network.ssid}" key=clear`
            try{
                const stdout = shell.syncExec(command).stdout;
                const regexp = /^\s*Key Content\s*: (.+)\s*$/gm.exec(stdout);
                if(regexp){
                    result.password = regexp[1];
                }
            }catch(e){}
        }
        return result;
    }
    
    log(msg, ...msgs){
        logger.log(msg, ...msgs);
    }
}

/*
async function test(){
    
    jtwifi = new jtWiFi('path\\to\\app');
    let count;
    if(count = await jtwifi.init()){
        logger.log('ap:', count);
    }else{
        logger.log('WiFi down...');
    }
//    const network = await jtwifi.lookup('TELLO-D3F077');
    const network = await jtwifi.lookup('TELLO-D2D555');
    if(network){
        await jtwifi.disconnect();
        logger.log('connect:', await jtwifi.connect(network));
        //logger.log(jtwifi.connectionState.network);
        while(jtwifi.connectionState.connected){
            logger.log('running...');
            await sleep(1000);
        }
        //await jtwifi.disconnect();
//        logger.log('fallback:', await jtwifi.connect());
//        logger.log(jtwifi.connectionState.network);
        jtwifi.stop();
    }else{
        logger.log(network);
        logger.log('Tello not found');
    }
}

test();
*/

module.exports = jtWiFi;