/**
 * @file Synchronized WebSocket client for jtWebSocketRepeater
 *      jtWebSockRepeater.js
 * @module ./jtWebSockClientPromise
 * @version 1.01.191012a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
//const WebSocket = require('ws');

class jtWebSockClientPromise{
    constructor(args){
        this._hostComm = 'localhost';
        if(args.hostComm){
            this._hostComm = args.hostComm;
        }

        this._portComm = 8888;
        if(args.portComm){
            this._portComm = args.portComm;
        }

        this._apiComm = 'api';
        if(args.apiComm){
            this._apiComm = args.apiComm;
        }

        this._commID = 0;
        this._sock = null;
        this._watchdogTerminater = false;

        this._responseBuffer = [];
    }

    init(){
        return new Promise( (resolve) => {
            let result = null;
            try{
                this._sock = new WebSocket('ws://' + this._hostComm + ':' + this._portComm + '/' + this._apiComm);
                this._sock.addEventListener('open', () => {
                    this._sock.addEventListener('message', (sock) => {
                        this.log('WSC onMessage:', sock.data);
                        this._responseBuffer.push(JSON.parse(sock.data));
                    });
                    this._sock.addEventListener('close', () => {
                        this.log('client close');
                    });
                    this._sock.addEventListener('error', (e) => {
                        this.log('client error:', e);
                    });
                });
                Promise.resolve(this.waitReadyState())
                .then( () => {
                    resolve(true);
                });
            }catch(e){
                this.log('WSC.init: catch exeption:', e);
                resolve(false);
            }
        });
    }

    waitReadyState(){
        return new Promise( resolve => {
            let timer = 5000;
            const interval = 10;
            let watchdog = null;
            let result = new Promise( resolve => {
                watchdog = setInterval( () => {
                    if(this._sock.readyState === WebSocket.OPEN){
                        resolve(true);
                    }
                    timer = timer - interval;
                    if(timer<0){
                        resolve(false);
                    }
                }, interval);
            }).then( (result) => {
                clearInterval(watchdog);
                this.log('WSC WebSock connection:' + this._sock.url);
                resolve(result);
            });
        });
    }

    get responseBuffer(){
        return this._responseBuffer;
    }

    getResponse(commID){
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

    clearResponseBuffer(){
        this._responseBuffer = [];
        return;
    }

    request(message = 'command', type = 'sync', timeout = 10000){
        return new Promise( resolve => {
            let result = null;
            let response = null;
            let timer = timeout;
            const interval = 5;
            let watchdog = null;

            const commID = (++this._commID);
            const req =  commID + ':' + type + ':' + message;

            const waitPromise = new Promise( resolve => {
                this.log('WSC request:', req);
                this._sock.send(req);
                watchdog = setInterval( () => {
                    response = this.getResponse(commID)
                    if(response && response.length){
                        response = response[0];

                        if(response){
                            resolve(response);
                        }
                        timer = timer - interval;
                        if(timer<0){
                            resolve(false);
                        }
                    }
                }, interval);
            }).then( (response) => {
                clearInterval(watchdog);
                if(response){
                    this.log('WSC response:',response);
                } else {
                    this.log('WSC request: response is null');
                }
                resolve(response);
            }).catch( e => {
                this.log('WSC request() send rejected:', e);
            });
        }).then( response => {
            return response;
        });
    }

    close(){
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

module.exports = jtWebSockClientPromise;