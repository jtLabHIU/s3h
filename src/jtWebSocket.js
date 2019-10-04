/**
 * @file Synchronized WebSocket server/client
 *      jtWebSocket.js
 * @module ./jtWebSocket
 * @version 0.10.191004a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

const ws = require('ws');
const sleep = require('./jtSleep');

class jtWebSocket{
    constructor(){
        this._host = 'localhost';
        this._port = 8888;
        this._server = null;
        this._client = null;
    }

    async createServer( port = 8888,
                        onGetMessage = this.onDebugServerGetMessage,
                        onConnectionClose  = this.onDebugServerConnectionClose){
        let result = true;
        try{
            this._port = port;
            this._server = new ws.Server({port:this._port});
            this._server.on('connection', (ws) => {
                ws.on('message', (message) => {
                    onGetMessage(message);
                });
                ws.on('close', () => {
                    onConnectionClose();
                });
            });
        }catch(e){
            result = e;
        }
        return result;
    }

    async closeServer(){
        await this._server.close();
        this._server = null;
        return;
    }

    async onDebugServerGetMessage(message){
        console.log('jtWebSockServer receive:', message);
        return
    }

    async onDebugServerConnectionClose(){
        console.log('jtWebSockServer: one or more client disconnected');
        return
    }

    async response(message){
        return await this._server.send(message);
    }

    async createClient( host = 'localhost',
                        port = 8888,
                        onGetMessage = this.onDebugClientGetMessage,
                        onConnectionClose  = this.onDebugClientConnectionClose){
        let result = true;
        try{
            this._host = host;
            this._port = port;
            this._client = new ws('ws://' + this._host + ':' + this._port);
            this._client.on('open', () => {
                this._client.on('message', (message) => {
                    onGetMessage(message);
                });
                this._client.on('close', () => {
                    onConnectionClose();
                });
            });
        }catch(e){
            result = e;
        }
        return result;
    }

    async onDebugClientGetMessage(message){
        console.log('jtWebSockClient receive:', message);
        return
    }

    async onDebugClientConnectionClose(){
        console.log('jtWebSockClient: the server disconnected');
        return
    }
    
    async closeClient(){
        await this._client.close();
        this._client = null;
        return;
    }

    async request(message){
        return await this._client.send(message);
    }
}

module.exports = jtWebSocket;
