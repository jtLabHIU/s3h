/**
 * @file Simple debug console via TCP/IP
 *      jtDebugConsole.js
 * @module ./jtDebugConsole
 * @version 1.10.200326a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2020 jtLab, Hokkaido Information University
 */
/** */

const net = require('net');

class DebugServer{
    constructor(port = 5964, domain = 'whole module'){
        /** the TCP port number that debug client connect to
         * @type {number}
         */
        this._port = port;

        /**
         * the debug domain name of this server
         * @type {string}
         */
        this._domain = domain;

        /**
         * array of client sockets
         * @type {net.Socket|null}
         */
        this._client = null;

        /**
         * debug server object
         * @type {net.Server|null}
         */
        this._server = null;

        /**
         * log buffer
         * @type {string[]}
         */
        this._logBuffer = [];

        /**
         * command buffer
         * @type {Buffer}
         */
        this._commandBuffer = Buffer.from([]);
    }

    get port(){
        return this._port;
    }

    log(...datum){
        let data = '';
        for(let idx in datum){
            if(datum[idx] instanceof Buffer){
                data += '<Buffer';
                for(const value of datum[idx].values()){
                    data += ' ' + value.toString(16);
                }
                data += '>';
            }else if(typeof datum[idx] == 'object'){
                data += JSON.stringify(datum[idx], null, ' ');
            } else {
                data += datum[idx];
            }
            if(idx < datum.length-1){
                data +=' ';
            }
        }
        console.log(data)
        this._logBuffer.push(data);
        if(this._client && this._client.alive && !this._client.pause){
            while(this._logBuffer.length){
                this._client.write(`${this._logBuffer.shift()}\r\n`);
            }
        }
    }

    reset(){
        this._logBuffer = [];
    }

    start(port = null, domain = null){
        if(port){
            this._port = port;
        }
        if(domain){
            this._domain = domain;
        }
        if(!this._sevrer){
            this._server = net.createServer( socket => {
                if(this._client && this._client.alive){
                    socket.end();
                }else{
                    socket.alive = true;
                    socket.pause = false;
                    this._client = socket;
                    socket.on('error', () => { socket.alive = false; });
                    socket.on('end', () => { socket.alive = false; });
                    socket.on('close', () => { socket.alive = false; });
                    socket.on('connect', () => {
                        this.log(`jtDebugConsole <- ${this._domain}\r\n`);
                    });
                    socket.on('data', data => {
                        this._parseCommand(data);
                    });
                }
            }).listen(this._port);
        }
    }

    stop(){
        if(this._server){
            if(this._client && this._client.alive){
                this._client.end( () => {
                    this._client = null;
                });
            }
            this._server.close( () => {
                this._server = null;
            });
        }
    }

    _parseCommand(data){
        let buffer = Buffer.concat([this._commandBuffer, data], this._commandBuffer.length + data.length);
        let pos = -1;
        let loop = true;
        while(loop){
            const posPrev = pos + 1;
            pos = buffer.indexOf(10, posPrev);
            if(pos<0){
                this._commandBuffer = buffer.slice(posPrev);
                loop = false;
            } else {
                let command = buffer.toString('utf8', posPrev, pos).replace(/[\r\n]/g, '');
                if(command == ''){
                    if(this._client.pause){
                        command = 'resume';
                    }else{
                        command = 'pause';
                    }
                }
                if(command == 'pause'){
                    this._client.pause = true;
                } else if(command == 'resume'){
                    this._client.pause = false;
                } else if(command == 'reset'){
                    this.reset();
                } else if(command == 'stop'){
                    this.stop();
                }
                this.log('command received:', command);
            }
        }
    }
}

const logger = new DebugServer();
logger.start();
module.exports = {
     DebugServer,
     logger
}