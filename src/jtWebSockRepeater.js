/**
 * @file Synchronized WebSocket repeater to native socket
 *      jtWebSockRepeater.js
 * @module ./jtWebSockRepeater
 * @version 0.00.191007a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

const ws = require('ws');
const dgram = require('dgram');
const wifi = require('./jtWiFi');
const sleep = require('./jtSleep');

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

class jtWebSockRepeater{
    constructor(args){
        this._wifi = new wifi();

        this._devices = [{
            'name': 'D2D555',
            'ssid': 'TELLO-D2D555',
            'mac': 'D2D555',
            'ip': '192.168.10.1',
            'port': {'udp':8889},
            'via': {'udp':8889},
            //'via': {'udp':0},
            'downstream': [{'udp':8890}, {'udp':11111}]
        }];
        if(args.devices){
            this._devices = args.devices;
        }

        this._device = null;

        /** WebSocket up/downstream port
         *  @type {number} _portComm */
        this._portComm = 8888;
        if(args.portComm){
            this._portComm = args.portComm;
        }

        this._msgIDCount = 0;
        this._requestQue = [];
        this._responseQue = [];

        this._commServ = null;

        this._watchdogTerminater = false;
    }

    async init(){
        let count = 0;
        let result = true;

        // init WebSocket upstream server
        try{
            this._commServ = new ws.Server({port:this._portComm});
            this._commServ.readyState = ws.CLOSED;
            this._commServ.on('connection', (sock) => {
                sock.on('message', (message) => {
                    const temp = message.split(':');
                    this._requestQue.push({
                        'msgID': this._msgIDCount++,
                        'commID': temp[0],
                        'type': temp[1],
                        'command': temp[2],
                        'result': false,
                        'message': 'not execute yet',
                        'sock': sock
                    });
                });
                sock.on('close', () => {
                    this._requestQue.push({
                        'msgID': this._msgIDCount++,
                        'commID': -5963,
                        'type': 'broadcast',
                        'command': 'terminate',
                        'result': false,
                        'message': 'not execute yet'
                    });
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
            const req = this.request;
            let response = req;
            if(req.type == 'sync'){
                response = await this.sendCommand(req);
            } else if(req.type == 'async'){
                this.sendCommandAsync(req);
                response.result = true;
                response.message = 'send as async'
            } else if(req.type == 'broadcast'){
                this.execModuleCommand(req);
                this.sendCommandAsync(req);
                response.result = true;
                response.message = 'broadcast as async'
            } else {
                response = await this.execModuleCommand(req);
            }
            const sender = JSON.stringify({
                'commID': parseInt(response.commID),
                'result': response.result,
                'message': response.message
            });
            if(!this._watchdogTerminater){
                const res = response.sock.send(sender);
            }    
            this.log('request finish:', sender);
        }
    }

    stop(){
        this._watchdogTerminater = true;
        try{
            this._device.socket.close();
            this._wifi.disconnect();
        }catch(maleCatch){}
    }

    close(){
        this._commServ.close();
    }

    async sendCommand(req){
        let response = req;
        const message = Buffer.from(req.command);
        this.log('send to device:', req.command);
        try{
            await this._device.socket.send(message, 0, message.length,
                this._device.port.udp, this._device.ip,
                function(err){
                    if(err){
                        throw err;
                    }
                }
            );
            response.message = await this.popResponse(this._device.socket);
            if(response.message === false){
                response.result = false;
                response.message = 'recv from device: response timeout'
            }else{
                response.result = true;
                this.log('recv from device:', response.message);
            }
        }catch(e){
            this.log('device command send error', e);
            response.message = 'device command send error';
        }
        return response;
    }

    async sendCommandAsync(req){
        let response = req;
        response.result = false;
        response.message = 'not implement';
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
        }
        return response;
    }

    async connect(response, deviceName = null){
        let device = null;
        let count = 0;

        if(deviceName){
            device = this._devices.find( value => (value.name == deviceName));
        }else{
            if(this._device){
                device = this._device;
            }else if(this._devices.length){
                device = this._devices[0];
            }else{
                device = {
                    'ssid': null
                }
            }
        }
        this._device = device;

        // connect WiFi direct
        if(device.ssid){
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

            // make socket
            if(typeof device.via.udp !== 'undefined'){
                device.socket = dgram.createSocket('udp4');
                device.socket.responseQue = [];

                device.socket.on(
                    'message', (msg, rinfo) => {
                        //ToDo: rinfo back {address,family,port,size} from sender device
                        this.log('devSock onMessage:', msg);
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
                response.result = true;
                response.message = 'ok';
            }else{
                this.log('devServ UDP datagram undefined');
                return response;
            }
            this._device = device;
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
                if(this._watchdogTerminater || timer-- < 0){
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

