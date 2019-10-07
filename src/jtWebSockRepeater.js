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

var _requestQue = [];
var _responseQue = [];

class jtWebSockRepeater{
    constructor(args){
        this._wifi = new wifi();

        this._portComm = 8888;
        if(args.portComm){
            this._portComm = args.portComm;
        }

        this._msgIDCount = 0;

        this._commServ = null;
        this._devServ = null;


    }

    async init(){
        let count = 0;

        // init WebSocket upstream server
        try{
            this._commServ = new ws.Server({port:this._portComm});
            this._commServ.on('connection', (sock) => {
                sock.on('message', (message) => {
                    const temp = message.split(':');
                    _requestQue.push({
                        'msgID': this._msgIDCount++,
                        'commID': temp[0],
                        'type': temp[1],
                        'command': temp[2]
                    });
                });
                sock.on('close', () => {
                    _requestQue.push({
                        'msgID': this._msgIDCount++,
                        'commID': -5963,
                        'type': broadcast,
                        'command': 'terminate'
                    });
                });
            });
            this.log('commServ is listening at WebSocket', this._portComm);
        }catch(e){
            this.log('create commServ failed at WebSocket', this._portComm);
            this.log(e);
        }

        // init WiFi
        if(count = await this._wifi.init(false)){
            this.log('WiFi found ' + count + 'APs');
        }else{
            this.log('WiFi down...');
        }
        return;
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

