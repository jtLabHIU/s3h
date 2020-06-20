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
const { logger } = require('./jtDebugConsole');

/**
 * Mesh data object
 * @typedef {object} MeshData
 * @property {number} clientID - sender clientID
 * @property {string} messageType - message(broadcast/sensor-update/peer-name)
 * @property {string} key - message key
 * @property {string|null} value - message value
 */

/** */
class jtMeshServer{
    constructor(){
        this.stop();
    }

    get isRunning(){
        return this._running;
    }

    /**
     * stop Mesh server
     */
    async stop(){
        if(this._running){
            await this._server.close();
        }
        this._sensors = {};
        this._server = {};
        this._client = [];
        this._running = false;
        this._clientID = 0;
    }

    /**
     * start Mesh server
     * @param {boolean} [restart =false] - restart the server evenif the server is running
     * @returns {boolean} - returns `false` when the server is running and caller doesn't want to restart the server 
     */
    async start(restart =false){
        let result = false;
        if(restart || !this._running){
            this._sensors = {};
            this._client = [];
            this._server = net.createServer(socket => {
                logger.log(`client #${this._clientID} connected.`);
                socket.clientID = this._clientID++;
                socket.alive = true;
                socket.inputBuffer = Buffer.from([]);
                socket.clientVer = 0;
                socket.encoding = 'utf8';
                this._client[socket.clientID] = socket;
                socket.on('error', () => {
                    socket.alive = false;
                });
                socket.on('data', data => {
                    socket.inputBuffer = Buffer.concat([socket.inputBuffer, data], socket.inputBuffer.length + data.length);
                    let loop = true;
                    while(loop){
                        if(socket.inputBuffer.length>=4){
                            const len = socket.inputBuffer.readInt32BE();
                            if(len > socket.inputBuffer.length - 4){
                                logger.log('receive short packet:', len, data);
                            } else {
                                const message = socket.inputBuffer.toString(socket.encoding, 4, len + 4).trimEnd();
                                socket.inputBuffer = socket.inputBuffer.slice(len + 4);
                                const messages = this.parseMeshMessage(socket.clientID, message);

                                // server side command recognizer
                                messages.forEach( mes => {
                                    if(mes.messageType == 'peer-name'){
                                        if(mes.key == 'anonymous'){
                                            socket.clientVer = 1.4;
                                        }else{
                                            socket.clientVer = parseInt(mes.key);
                                        }
                                    }
                                });

                                // broadcast a Mesh packet to clients
                                /** @todo: please consider: send JSON stringified packet directly for jtS3H clients */
                                const packet = this.composeMeshMessage(messages);

                                for(let element of this._client){
                                    if(element && element.clientID != socket.clientID && element.alive){
                                        logger.log(`sent data to client #${element.clientID}`)
                                        element.write(packet);
                                    }
                                }

                                logger.log(`from client #${socket.clientID}`, packet);
                            }
                        }else{
                            loop = false;
                        }
                    }
                });
                socket.on('close', () => {
                    logger.log(`client #${socket.clientID} disconnected.`);
                    socket.alive = false;
                    this._client[socket.clientID] = null;
                })
            }).listen(42001);
            this._running = true;
            result = true
        }
        return result;
    }

    /**
     * parse Mesh message
     * @param {number} [clientID=-1] - who is this message from
     * @param {String} message - Mesh message
     * @returns {MeshData[]} - Mesh message array
     */
    parseMeshMessage(clientID = -1, message = null){
        let result = [];
        let pos = 0;
        let key = null;
        let value = '';
        let inQuote = false;
        let char = '';
        if(message){
            pos = message.indexOf(' ');
            if(pos<0 || pos>32){
                /** @todo what is `send-vars`? it looks indicate `loopback` */
                logger.log('invalid Mesh message: no or too long message type.');
                logger.log(message);
                result = false;
            } else {
                const messageType = message.slice(0, pos++).toLowerCase();
                const mes = message.split('');
                while(pos<=message.length){
                    if(pos<message.length){
                        char = mes[pos++];
                    } else {
                        char = '';
                        pos++;                        
                    }
                    if(char === '"'){
                        if(inQuote){
                            if(pos<message.length && mes[pos] === '"'){
                                value += '"';
                                pos++;
                            } else {
                                inQuote = false;
                            }
                        } else {
                            inQuote = true;
                        }
                    } else if((char === ' ' || char === '') && !inQuote){
                        if(value){
                            if(!key){
                                key = value;
                                value = '';
                            } 
                            if((key && value) || char === ''){
                                const mesh = {
                                    'clientID': clientID,
                                    'messageType': messageType,
                                    'key': key,
                                    'value': value 
                                }
                                result.push(mesh);
                                key = null;
                                value = '';
                            }
                        }
                    } else {
                        if(char !== '"'){
                            value += char;
                        }
                    }
                }
            }
        }
        return result;
    }

    /**
     * compose Mesh message
     * @param {MeshData|MeshData[]} datum - Mesh message object or its array of `sensor-update`
     * @returns {Buffer|null} - a packet described by Remote Sensors Protocol
     */
    composeMeshMessage(datum){
        let result = null;
        if(typeof datum === 'object'){
            let meshData = [];
            let message = '';
            let lastMessage = null;
            let messages = [];
            let length = 0;
            let pos = 0;

            // argument regulation
            if(Array.isArray(datum)){
                meshData = datum;
            } else {
                meshData.push(datum);
            }

            // push all messages as buffer
            for(const element of meshData){
                if(element.messageType !== lastMessage){
                    lastMessage = element.messageType;
                    if(message){
                        const strbuf = Buffer.from(message);
                        messages.push(strbuf);
                        length += strbuf.length + 4;
                    }
                    message = element.messageType;
                }
                message = `${message} "${element.key}"`
                if(element.value){
                    message = `${message} "${element.value}"`
                }
            }
            const strbuf = Buffer.from(message);
            messages.push(strbuf);
            length += strbuf.length + 4;

            // compose all messages
            result = Buffer.allocUnsafe(length);
            for(const element of messages){
                result.writeInt32BE(element.length,pos);
                result.write(message, pos + 4);
                pos += element.length + 4;
            }
        }
        return result
    }
}

const meshServer = new jtMeshServer();

module.exports = {
    jtMeshServer,
    meshServer
}