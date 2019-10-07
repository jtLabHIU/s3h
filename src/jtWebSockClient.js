/**
 * @file Synchronized WebSocket client for jtWebSocketRepeater
 *      jtWebSockRepeater.js
 * @module ./jtWebSockClient
 * @version 0.00.191007a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

const ws = require('ws');
const WSR = require('./jtWebSockRepeater');
const sleep = require('./jtSleep');

class jtWebSockClient{
    constructor(args){
        this._hostComm = 'localhost';
        if(args.hostComm){
            this._hostComm = args.hostComm;
        }

        this._portComm = 8888;
        if(args.portComm){
            this._portComm = args.portComm;
        }

        this._commID = 0;
        this._sock = null;
    }

    async init(){
        this._sock = new ws('ws://' + this._hostComm + ":" + this._portComm);
        this._sock.on('open', () => {
            this._sock.on('message', (message) => {
                this.log(message);
            });
            this._sock.on('close', () => {
                this.log('client close');
            });
            this._sock.on('error', (e) => {
                this.log('client error:', e);
            });
        });
    }

    async request(message){
        const wait = await this.waitReadyState();
        this.log('await:', wait);
        if(!wait){
            this.log("waitReadyState timeout");
        }else{
            this.log("waitReadyState:done");
            this.log(this._sock.readyState);
            this.log('sending: message');
            return await this._sock.send(message);
        }
    }

    async waitReadyState(timeout = 5000){
        const interval = 10;
        let timer = timeout;
        let watchdog = null;
        return new Promise( (resolve) => {
            watchdog = setInterval( () => {
                if(this._sock.readyState == ws.OPEN){
                    this.log('waitReadyState: ready', timer);
                    resolve(true);
                }
                timer = timer - interval;
                if(timer<0){
                    this.log('waitReadyState: timeout');
                    resolve(false);
                }
            }, interval);
        }).then( (result) => {
            clearInterval(watchdog);
            this.log('watchdog result =', result);
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

module.exports = jtWebSockClient;