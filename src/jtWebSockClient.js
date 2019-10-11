/**
 * @file Synchronized WebSocket client for jtWebSocketRepeater
 *      jtWebSockRepeater.js
 * @module ./jtWebSockClient
 * @version 1.00.191011b
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

const ws = require('ws');
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
        this._watchdogTerminater = false;

        this._responseBuffer = [];
    }

    async init(){
        let result = null;
        try{
            this._sock = new ws('ws://' + this._hostComm + ":" + this._portComm);
            this._sock.on('open', () => {
                this._sock.on('message', (message) => {
                    //this.log('WSC onMessage:', message);
                    this._responseBuffer.push(JSON.parse(message));
                });
                this._sock.on('close', () => {
                    this.log('client close');
                });
                this._sock.on('error', (e) => {
                    this.log('client error:', e);
                });
            });
            result = await sleep.wait(5000, 10, async () => {
                return (this._sock.readyState === ws.OPEN);
            });
            this.log('WSC WebSock connected:' + this._sock.url);
        }catch(e){
            this.log('WSC.init: catch exeption:', e);
            result = false;
        }
        return result;
    }

    get responseBuffer(){
        return this._responseBuffer;
    }

    async getResponse(commID){
        let result = null;
        let idx = 0;
        let len = this._responseBuffer.length;
        if(len){
            result = [];
            while(idx < len){
                if(this._responseBuffer[idx].commID === commID){
                    result.push(this._responseBuffer[idx]);
                    this._responseBuffer.splice(idx,1);
                    len--;
                }else{
                    idx++;
                }
            }
        }
        return result;
    }

    async clearResponseBuffer(){
        this._responseBuffer = [];
        return;
    }

    async request(message = 'command', type = 'sync', timeout = 10000){
        let result = null;
        let response = null;
        const commID = (++this._commID);
        const req =  commID + ':' + type + ':' + message;
        try{
            this.log('WSC request:', req);
            await this._sock.send(req);
            if( await sleep.wait(timeout, 1, async () => {
                    return (response = await this.getResponse(commID)) !== null; 
                })
            ){
                this.log('WSC response:',response);
                result = response;
            } else {
                this.log('WSC request: response is null');
            }
        }catch(e){
            this.log('WSC request() send:', e);
        }
        return result;
    }
    async close(){
        this._watchdogTerminater = true;
        this._sock.close();
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