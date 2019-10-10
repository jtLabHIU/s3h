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

var _responseQue = [];

class jtWebSockRepeater{
    constructor(args){
        this._wifi = new wifi();

        // WebSocket up/downstream port
        this._portComm = 8888;
        if(args.portComm){
            this._portComm = args.portComm;
        }



        this._msgIDCount = 0;
        this._requestQue = [];

        this._commServ = null;
        this._devServ = null;

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
    
        // init WiFi
        if(count = await this._wifi.init(false)){
            this.log('WiFi found ' + count + ' APs');
        }else{
            this.log('WiFi down...');
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
        this._watchdogTeminater = false;
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
            const res = response.sock.send(sender);
            this.log('request finish:', sender);
        }
    }

    stop(){
        this._watchdogTerminater = true;
    }

    close(){
        this._commServ.close();
    }

    async sendCommand(req){
        let response = req;
        response.result = true;
        response.message = 'OK';
        return response;
    }

    async execModuleCommand(req){
        let response = req;
        response.result = false;
        response.message = 'not understand';
        if(req.command == 'terminate'){
            response.result = true;
            response.message = 'OK';
        }
        return response;
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

