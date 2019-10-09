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

var _responseQue = [];

class jtWebSockRepeater{
    constructor(args){
        this._wifi = new wifi();

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
                        'command': temp[2]
                    });
                });
                sock.on('close', () => {
                    this._requestQue.push({
                        'msgID': this._msgIDCount++,
                        'commID': -5963,
                        'type': broadcast,
                        'command': 'terminate'
                    });
                });
            });
            this._commServ.on('listening', () => {
                this._commServ.readyState = ws.OPEN;
                this.log('commServ is listening at WebSocket', this._portComm);
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
            result = this._requestQue[0];
            this._requestQue.shift(1);
        }
        return result;
    }

    async waitRequest(){
        return sleep.wait(0, 1, async () => {
            return this._requestQue.length;
        }, async () => {
            return this._watchdogTerminater;
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

