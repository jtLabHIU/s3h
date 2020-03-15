/**
 * @file classes for Scratch Mesh network server with Remote Sensors Protocol
 *      jtMesh.js
 * @module ./jtMesh
 * @version 0.01.200310a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2020 jtLab, Hokkaido Information University
 */
/** */
 const net = require('net');

/**
 * Mesh data object
 * @typedef {object} MeshData
 * @property {number} clientID - sender clientID
 * @property {string} message - message(broadcast/sensor-update/peer-name)
 * @property {string} key - message key
 * @property {string|null} value - message value
 */

/** */
class jtMeshServer{
    constructor(){
        this._sensors = {};
        this._server = {};
        this._client = [];
        this._watchdogTerminater = false;
        this._running = false;
        this._clientID = 0;
    }

    getClientIndex(){

    }

    /** @ToDo already start? */
    start(){
        this._sensors = {};
        this._client = [];
        this._server = net.createServer(socket => {
            console.log('client connected');
            socket.clientID = this._clientID;
            socket.alive = true;
            this._client[this._clientID++] = socket;
            socket.on('error', () => {
                socket.alive = false;
            });
            socket.on('data', data => {
                console.log('client:', data);
                /** @ToDo Mesh recognizer must be separate */
                /** @ToDo keys and values allow any special characters */
                // get message length
                const len = data.readInt32BE();
                let params = data.toString('utf8', 4, len+4).split(' ');
                // message type: `broadcast` or `sensor-update` or `peer-name(anonymous)`
                const messageType = params.shift().toLowerCase();
                // request each message
                while(params.length>0 && params[0].length>0){
                    console.log(params.length, params[0], params[0].length);
                    // broadcast message or sensor name
                    let key = params.shift();
                    if(key.slice(0, 1) === '"'){
                        if(key.slice(-1) === '"'){
                            key = key.slice(1, key.length-1);
                        }else{
                            this.log('invalid Remote Sensors Protocol key')
                        }
                    }
                    // sensor value
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

                    // request to helper as Mesh message (commID:-1)
                    const sender = JSON.stringify({
                        'clientID': socket.clientID,
                        'message': messageType,
                        'key': key,
                        'value': value
                    });
                    if(!this._watchdogTerminater && this._running){
                        console.log(socket.clientID, sender);
                        for(let idx in this._client){
                            if(idx != socket.clientID){
                                let message = `${messageType} "${key}"`
                                if(value){
                                    message = `${message} "$value"`
                                }
                                const strbuf = Buffer.from(message);
                                const buf = Buffer.allocUnsafe(strbuf.length + 4);
                                buf.writeInt32BE(strbuf.length);
                                buf.write(message, 4);
                                if(socket.alive){
                                    console.log(socket.write(buf));
                                    console.log(idx, buf);
                                    //response.result = true;
                                    //response.message = 'Mesh message: ' + req.command;
                                }else{
                                    //response.message = 'Scratch MESH disconnected.';
                                }
                            }
                        }
                    }
                }
            });
        }).listen(42001);
        this._running = true;
    }

    /**
     * parse Mesh packet
     * @param {Buffer} data - Mesh packet
     * @returns {MeshData[]} - Mesh data array
     */
    parseMeshPacket(data = null){
        const result = [];
        if(data){
            // get message length
            const len = data.readInt32BE();
            let params = data.toString('utf8', 4, len+4).split(' ');

        }
        return result;
    }

    composeMeshPacket(){

    }
}

const server = new jtMeshServer();
server.start();
