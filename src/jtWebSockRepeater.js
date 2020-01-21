/**
 * @file Synchronized WebSocket repeater to native socket
 *      jtWebSockRepeater.js
 * @module ./jtWebSockRepeater
 * @version 2.01.200121a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

const iconv = require('iconv-lite');
const ws = require('ws');
const net = require('net');
const dgram = require('dgram');
const wifi = require('./jtWiFi');
const sleep = require('./jtDevice/jtSleep');
const { exec } = require('child_process');

/**
 * - WSRPacket:
 *  request / response packet
 * @typedef {object} WSRPacket
 * @property {number} msgID - auto increment number in the order received by repeater
 * @property {number} commID - sequential number that is assigned by client
 * @property {string} type - command type (module/sync/async/broadcast)
 * @property {string} command - command string
 * @property {boolean} result - whether command execution was successful
 * @property {string} message - response message
 */
let packet = null;
/**
 * @classdesc
 * - Portal class:
 *  a porting socket information and instance that communicate with WSR
 */
class Portal{
    /**
     * - WSRPortal:
     *  protocol description that a WSRDevice will communicate through
     *                            commSock            portSock
     * - Master(e.g. jtScratch) ---upstream---> WSR ---upstream---> Device
     * - Master(e.g. jtScratch) <-downstream--- WSR <-downstream--- Device
     * @typedef {object} WSRPortal
     * @property {string} name - the unique ID of this portal
     * @property {string} L12 - Layer1/2 type; ethernet/wlan/wlan_sta/bt/bt_pan/ble/serial/hardcode
     * @property {string} L34 - Layer3/4 type; tcp/udp/ipc/ble/serial/hardcode
     * @property {string} L567 - Layer5/6/7 type; binary/text/http/websock
     * @property {string} host - device hostname/IP address/COM port/
     * @property {string} mac - device MAC address/BD_ADDR
     */
    /**
     * @constructor
     * @param {WSRPortal} args - WSRPortal argument
     */
    constructor(args){
        /** @member {WSRPortal.tcp} tcp - TCP port number (not implemented yet) */
        this.tcp = null;
        if(args.tcp){
            this.tcp = args.tcp;
        }
        /** @member {WSRPortal.udp} udp - UDP port number */
        this.udp = null;
        if(args.udp){
            this.udp = args.udp;
        }
        /** @member {WSRPortal.ipc} ipc - IPC port number (not implemented yet) */
        this.ipc = null;
        if(args.ipc){
            this.ipc = args.ipc;
        }
        /** @member {WSRPortal.http} http - HTTP 'host.domain:port/dir' string (not implemented yet) */
        this.http = null;
        if(args.http){
            this.http = args.http;
        }
        /** @member {WSRPortal.websock} websock - WebSocket 'host.domain:port/dir' string (not implemented yet) */
        this.websock = null;
        if(args.websock){
            this.websock = args.websock;
        }
    }
}

/**
 * @classdesc
 * - Device class:
 *  a device information and instance that connect to WSR
 */
class Device{
    /**
     * - WSRDevice:
     *  a device information and instance that connect to WSR
     * @typedef {object} WSRDevice
     * @property {string} name - device name 
     * @property {string|null} ssid - own SSID
     * @property {string|null} mac - MAC address
     * @property {string|null} ip - IP address
     * @property {Portal} port - port number that which port is command port of target device
     * @property {Portal} via - port number that which port is command port of WSR device instance
     * @property {Portal[]} downstream - port number that which ports are downstream port from target device
     * @property {Portal[]} upstream - port number that which ports are upstream port from target device
     */
    /**
     * @constructor
     * @param {WSRDevice} args - WSRDevice argument
     */
    constructor(args){
        /** @member {WSRDevice.name} name - device name*/
        this.name = 'D2D555';
        if(args.name){
            this.name = args.name;
        }
        /** @member {WSRDevice.ssid} ssid - own SSID */
        this.ssid = 'TELLO-D2D555';
        if(args.ssid){
            this.ssid = args.ssid;
        }
        /** @member {WSRDevice.mac} mac - MAC address */
        this.mac = '60:60:1f:d2:d5:55';
        if(args.mac){
            this.mac = args.mac;
        }
        /** @member {string} ip - IP address */
        this.ip = ''; //192.168.10.1
        if(args.ip){
            this.ip = args.ip;
        }
        /** @member {Portal} port - port number that which port is command port of target device */
        this.port = new Portal({ udp: 8889 });
        if(args.port){
            this.port = args.port;
        }
        /** @member {Portal} via - port number that which port is command port of WSR device instance */
        this.via = new Portal({ udp: 0 });
        if(args.via){
            this.via = args.via;
        }
        /** @member {Portal[]} downstream - port number that which ports are downstream port from target device */
        this.downstream = [new Portal({'udp':8890}), new Portal({'udp':11111})];
        if(args.downstream){
            this.downstream = args.downstream;
        }
        /** @member {Portal[]} upstream - port number that which ports are upstream port from target device */
        this.upstream = [];
        if(args.upstream){
            this.upstream = args.upstream;
        }
    }
}

class jtWebSockRepeater{
    constructor(args){
        this._wifi = new wifi();

        this._devices = [{
            'name': 'D2D555',
            'ssid': 'TELLO-D2D555',
            'mac': 'D2D555',
            'ip': '',   // 192.168.10.1
            'port': {'udp':8889},
            'via': {'udp':8889},
            'downstream': [{'udp':8890}, {'udp':11111}]
        }];
        if(args.devices){
            this._devices = args.devices;
        }

        this._device = { 'name': null };

        /** WebSocket up/downstream port
         *  @type {number} _portComm */
        this._portComm = 8888;
        if(args.portComm){
            this._portComm = args.portComm;
        }

        /** Tello status downstream port
         *  @type {number} _portStatus */
        this._portStatus = 8890;
        if(args.portStatus){
            this._portStatus = args.portStatus;
        }

        this._msgIDCount = 0;
        this._requestQue = [];
        this._responseQue = [];

        this._commServ = null;

        this._watchdogTerminater = false;

        this._mesh = {};
        this._mesh.sock = null;
        this._mesh.input = [];
    }

    addDeviceInfo(device, overWrite = false){
        const target = this._devices.find( value => (value.name == device.name));

        if(!target || overWrite){
            if(overWrite){
                this.log('addDeviceInfo: over write');
                removeDeviceInfo(device.name);
            }
            this.log('addDeviceInfo: new device');
            this._devices.push(device);
            this._device = this._devices[this._devices.length-1];
        }else{
            this.log('addDeviceInfo: already exists');
            this._device = target;
        }
    }

    removeDeviceInfo(name){
        let result = false;
        if(this._device.name == name){
            this._device = { 'name': null };
        }
        this._devices.filter( (value, index, array) => {
            if(value.name === name){
                array.splice(index, 1);
                result = true;
            }
        });
        return result;
    }

    async init(){
        let count = 0;
        let result = true;

        // init WebSocket upstream server
        try{
            this._commServ = new ws.Server({port:this._portComm});
            this._commServ.readyState = ws.CLOSED;
            this._commServ.on('connection', (sock) => {
                this.log('commServ accept client');
                this._commServ.connected = true;
                this._commServ.sock = sock;

                sock.on('message', (message) => {
                    this.log('commSock accept message');
                    const temp = message.split(':');
                    let command = temp[2];
                    let counter = 3;
                    while((temp.length)>counter){
                        command = command + ':' + temp[counter++]
                    }
                    this._requestQue.push({
                        'msgID': this._msgIDCount++,
                        'commID': temp[0],
                        'type': temp[1],
                        'command': command,
                        'result': false,
                        'message': 'not execute yet',
                        'sock': sock
                    });
                });
                sock.on('close', () => {
                    this.log('commsock connection close');
                    if(this._device.socket){
                        this._device.socket.close();
                        this._device.socket = undefined;
                    }
                    if(this._device.status){
                        this._device.status.close();
                        this._device.status = undefined;
                    }
                    this._commServ.connected = false;
                });
            });
            this._commServ.on('listening', () => {
                this._commServ.readyState = ws.OPEN;
                this.log('commServ is listening at WebSocket', this._portComm);
                this.start();
            });
            this._commServ.on('close', () => {
                this._commServ.readyState = ws.CLOSING;
                this.log('commServ is closing');
                this._requestQue.push({
                    'msgID': this._msgIDCount++,
                    'commID': -5963,
                    'type': 'broadcast',
                    'command': 'terminate',
                    'result': false,
                    'message': 'not execute yet'
                });
                this.stop();
            });
        }catch(e){
            this.log('create commServ failed at WebSocket', this._portComm);
            result = false;
            this.log(e);
        }

        const success = await sleep.wait(5000, 10, async () =>{
            return (this._commServ.readyState === ws.OPEN);
        })
        if(!success){
            this.log('create commServ failed at WebSocket', this._portComm);
            result = false;
        }

        return result;
    }

    get requestQue(){
        return this._requestQue
    }

    get request(){
        let result = null;
        if(this._requestQue.length){
            result = this._requestQue.shift();
        }
        return result;
    }

    async waitRequest(){
        return await sleep.wait(0, 1, async () => {
            return this._requestQue.length;
        }, async () => {
            return this._watchdogTerminater;
        });
    }

    async start(){
        this._watchdogTerminater = false;
        while(await this.waitRequest()){
            if(this._commServ.connected){
                const req = this.request;
                let response = req;
                if(req.type == 'sync'){
                    response = await this.sendCommand(req);
                } else if(req.type == 'async'){
                    response = await this.sendCommandAsync(req);
                } else if(req.type == 'tellostatus'){
                    response = await this.respondStatusCommand(req);
                } else if(req.type == 'broadcast'){
                    this.execModuleCommand(req);
                    this.sendCommandAsync(req);
                    response.result = true;
                    response.message = 'broadcast as async'
                } else if(req.type == 'mesh'){
                    response = await this.execMeshCommand(req);
                } else {
                    response = await this.execModuleCommand(req);
                }
                const sender = JSON.stringify({
                    'commID': parseInt(response.commID),
                    'result': response.result,
                    'message': response.message
                });
                if(!this._watchdogTerminater && this._commServ.connected){
                    const res = response.sock.send(sender);
                }    
                this.log('request finish:', sender);
            }
        }
    }

    async stop(){
        this._watchdogTerminater = true;
        try{
            this.log('sock close:');
            await this._device.socket.disconnect();
            this.log('socket disconnect:');
            await this._device.socket.close();
            this.log('socket close:');
            await this._device.status.disconnect();
            this.log('status disconnect:');
            await this._device.status.close();
            this.log('status close:');
            await this._wifi.disconnect();
            this.log('all sockets are disconnected.');
            this._device.socket = undefined;
            this._device.status = undefined;
        }catch(maleCatch){}
    }

    close(){
        this._commServ.close();
    }

    async sendCommand(req){
        let response = req;
        const device = this._device;
        const message = Buffer.from(req.command);
        this.log('send to device:', req.command);
        try{
            await device.socket.send(message, 0, message.length,
                device.port.udp, device.ip,
                function(err){
                    if(err){
                        throw err;
                    }
                }
            );
            response.message = await this.popResponse(device.socket);
            if(response === false){
                response.result = false;
                response.message = 'recv from device: response timeout'
            }else{
                if(req.command === 'command' && response.message !== 'ok'){
                    this.log('binary mode stream detected: skip');
                    response.message = await this.popResponse(device.socket);
                } else if(req.command === 'streamon' && response.message === 'ok'){
                    exec('cd', (error, stdout) => {
                        let pathAdd = '';
                        const path = stdout.split('\\');
                        if(path[path.length-1].replace(/\r?\n/g, '').trim() === 's3h'){
                          pathAdd = 'jtS3H-win32-x64\\';
                        }
                        exec('".\\' + pathAdd + 'asset\\ffplay" -probesize 32 -i udp://0.0.0.0:11111 -framerate 30', (error) => {
                          if(error){
                            console.log(error);
                          }
                        });
                        console.log('".\\' + pathAdd + 'asset\\ffplay" -probesize 32 -i udp://0.0.0.0:11111 -framerate 30 was invoked as Stream Viewer');
                      });
                }

                response.result = true;
                this.log('recv from device:', response.message);
            }
        }catch(e){
            this.log('device command send error');
            response.message = 'device command send error';
        }
        return response;
    }

    async sendCommandAsync(req){
        let response = req;
        const device = this._device;
        const message = Buffer.from(req.command);
        this.log('send to device as async:', req.command);
        try{
            await device.socket.send(message, 0, message.length,
                device.port.udp, device.ip,
                function(err){
                    if(err){
                        throw err;
                    }
                }
            );
            response.result = true;
            response.message = 'sent as async'
        }catch(e){
            this.log('device command send error');
            response.result = false;
            response.message = 'device command send error';
        }
        return response;
    }

    async respondStatusCommand(req){
        let response = req;
        const device = this._device;
        const param = Buffer.from(req.command);
        if(device.status.status[param] !== undefined){
            this.log('status requested: ' + param + ' = ' + device.status.status[param]);
            response.result = true;
            response.message = device.status.status[param];
        }else{
            this.log('status ' + param + ': not found');
            response.result = false;
            response.message = 'not available';
        }
        return response;
    }

    async execModuleCommand(req){
        let response = req;
        response.result = false;
        response.message = 'not understand';

        const commands = req.command.split(' ');
        const command = commands[0];

        if(command == 'terminate'){
            response.result = true;
            response.message = 'OK';
        }else if(command == 'connect'){
            this.log('execModuleCommand: connect invoked');
            if(commands.length>1){
                response = await this.connect(response, commands[1]);
            }else{
                response = await this.connect(response);
            }
        }else if(command == 'popResponse'){
            this.log('execModuleCommand: pop response');
            response.result = true;
            response.message = await this.popResponse(this._device.socket);
            if(response.message === false){
                response.result = false;
                response.message = 'recv from device: response timeout'
            }
        }else if(command == 'addDevice'){
            this.log('addDevice invoke');
            const json = req.command.slice(10);
            this.log(json);
            this.addDeviceInfo(JSON.parse(json));

            response.result = true;
            response.message = 'OK';
        }
        return response;
    }

    async execMeshCommand(req){
        let response = req;
        response.result = false;
        response.message = 'not understand';

        const commands = req.command.split(' ');
        const command = commands[0];

        if(command == 'terminate'){
            response.result = true;
            response.message = 'OK';
        }else if(command == 'connect'){
            this.log('execMeshCommand: connect invoked');
            if(commands.length>1){
                response = await this.connectToMesh(response, commands[1]);
            }else{
                response = await this.connectToMesh(response);
            }
        }else{
            const buf = Buffer.allocUnsafe(command.length+16);
            buf.writeInt32BE(command.length+12);
            buf.write('broadcast "' + command + '"', 4);
            this.log(buf);
            if(this._mesh.sock){
                this.log(await this._mesh.sock.write(buf));
                response.result = true;
                response.message = 'Broadcasted: ' + command;
            }else{
                response.message = 'Scratch MESH disconnected.';
            }
        }

        return response;
    }

    /**
     * Connect to Scratch MESH network
     * and define with Scratch Remote Sensors Protocol 
     */
    async connectToMesh(response, host = 'localhost'){
        this._mesh.sock = await net.createConnection( { host: host, port: 42001 } );
        //this._mesh.sock.setNoDelay();
        this._mesh.sock.on('connect', () => { this.log('connected to Scratch MESH host:', host) });
        this._mesh.sock.on('close', () => { this.log('Scratch MESH connection closed.')});
        this._mesh.sock.on('data', (data) => {
            const len = data.readInt32BE();
            let params = data.toString('utf8', 4, len+4).split(' ');
            const messageType = params.shift().toLowerCase();
            while(params.length>0 && params[0].length>0){
                this.log(params.length, params[0], params[0].length);
                let key = params.shift();
                if(key.slice(0, 1) === '"'){
                    if(key.slice(-1) === '"'){
                        key = key.slice(1, key.length-1);
                    }else{
                        this.log('invalid Remote Sensors Protocol key')
                    }
                }

                let value = null;
                if(params.length>0){
                    value = params.shift();
                    if(value.slice(0, 1) === '"'){
                        if(value.slice(-1) === '"'){
                            value = value.slice(1, value.length-1);
                        }else{
                            this.log('invalid Remote Sensors Protocol value');
                        }
                    }
                }

                const sender = JSON.stringify({
                    'commID': -1,
                    'result': true,
                    'message': messageType,
                    'key': key,
                    'value': value
                });
                if(!this._watchdogTerminater && this._commServ.connected){
                    const res = this._commServ.sock.send(sender);
                }
            }
        });
        response.result = true;
        response.message = 'ok'

        return response;
    }

    async connect(response, deviceName = null){
        let device = this._device;
        let count = 0;

        this.log('start connect sequence');

        if(deviceName && deviceName != device.name){
            device = this._devices.find( value => (value.name == deviceName));
            if(device){
                this.log('switch to new device info:');
                this._device = device;
            }else{
                response.message = 'device info: ' + deviceName + ' not found';
                return response;
            }
        }else{
            this.log('reuse device info:', device);
        }

        // connect WiFi direct
        if(device.ssid && !this._wifi.connectionState.connected){
            this.log('tring to establish wifi connection.');
            // init WiFi
            if(count = await this._wifi.init(false)){
                this.log('WiFi found ' + count + ' APs');
            }else{
                response.message = 'WiFi down';
                return response;
            }

            // connect WiFi AP
            this.log('try to WiFi direct connect:', device.ssid);
            const network = await this._wifi.lookup(device.ssid);
            if(network){
                let loop = true;
                while(loop){
                    this.log((await this._wifi.connect(network)).msg);
                    device.mac = this._wifi.connectionState.network.mac;
                    device.ip = this._wifi.connectionState.network.ip;
                    if(device.ip){
                        this.log('IP:', device.ip);
                        loop = false;
                    }else if(this._wifi.connectionState.connected){
                        this.log('IP lookup failed. retry to connect');
                    }else{
                        response.message = 'WiFi direct connect: ' + device.ssid + ' not found';
                        return response;
                    }
                }
            }else{
                response.message = 'WiFi direct connect: ' + device.ssid + ' not found';
                return response;
            }
        }else{
            this.log('wifi connection is already established.');
        }

        // make socket
        if(device.socket === undefined || device.socket.ready === undefined || !device.socket.ready){
            this.log('device.socket === undefined:', device.socket === undefined);
            if(device.socket){
                this.log('device.socket.ready === undefined:', device.socket.ready === undefined);
                if(device.socket.ready){
                    this.log('!device.socket.ready:', !device.socket.ready);
                }
            }
            this.log('tring to establish devSock.');
            if(typeof device.via.udp !== 'undefined'){
            //devSock
                device.socket = dgram.createSocket('udp4');
                device.socket.responseQue = [];

                device.socket.on(
                    'message', (msg, rinfo) => {
                        //ToDo: rinfo back {address,family,port,size} from sender device
                        //this.log('devSock onMessage:', msg);
                        device.socket.responseQue.push(msg.toString());
                    }
                );
                device.socket.on(
                    'listening', () => {
                        const address = device.socket.address();
                        this.log(`devSock is listening at ${address.address}:${address.port}`);
                        device.socket.ready = true;
                    }
                );
                device.socket.bind(device.via.udp);
                await sleep.wait(5000, 10, async () => { return device.socket.ready; });

                //devStatus
                device.status = dgram.createSocket('udp4');
                device.status.status = {};

                device.status.on(
                    'message', (msg, rinfo) => {
                        //ToDo: rinfo back {address,family,port,size} from sender device
                        //this.log('devStatus onMessage:', msg);
                        //device.status.responseQue.push(msg.toString());
                        const status = msg.toString().split(';');
                        for(let i=0; i<status.length; i++){
                            const data = status[i].split(':');
                            if(data[1] !== undefined){
                                device.status.status[data[0]] = parseInt(data[1]);
                            }
                        }
                        //this.log(device.status.status);
                    }
                );
                device.status.on(
                    'listening', () => {
                        const address = device.status.address();
                        this.log(`devStatus is listening at ${address.address}:${address.port}`);
                        device.status.ready = true;
                    }
                );
                device.status.bind(device.downstream[0].udp);
                await sleep.wait(5000, 10, async () => { return device.status.ready; });

                response.result = true;
                response.message = 'ok';
                //this.log(device);
            }else{
                this.log('devServ UDP datagram undefined');
                return response;
            }
        }else{
            this.log('device sockets are already established.');
            response.result = true;
            response.message = 'ok';
        }
        return response;
    }

    responseReady(sock){
        return sock.responseQue.length;
    }

    popResponse(sock, timeout = 10000){
        let result = null;
        let responseWatchdog = null;
        const interval = 5;
        let timer = timeout/interval;
        return new Promise(resolve => {
            responseWatchdog = setInterval( () => {
                if(sock.responseQue.length>0){
                    result = sock.responseQue.shift();
                    resolve(result);
                }
                if(this._watchdogTerminater || timer-- < 0 || !this._commServ.connected){
                    resolve(false);
                }
            }, interval);
        }).then((result) => {
            clearInterval(responseWatchdog);
            return result;
        });
    }
    
    log(msg, ...msgs){
        if(msgs.length){
            console.log(msg, ...msgs);
        }else{
            console.log(msg);
        }
    }
}

module.exports = jtWebSockRepeater;
module.exports.Portal = Portal;
module.exports.Device = Device;

