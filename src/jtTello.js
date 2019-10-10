/**
 * @file Tello controller via WebSocket
 *      jtTello.js
 * @module ./jtTello
 * @version 0.50.191004a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 * 
 *  original Tello.js script
 *  by http://www.ryzerobotics.com 
 */

const http = require('http');
const dgram = require('dgram');
const sleep = require('./jtSleep');
const wifi = require('./jtWiFi');
const ws = require('ws');

const JTTELLO_DIRECT_COMMANDS = ['emergency', 'rc'];
const JTTELLO_PASS_COMMANDS = ['reset_all'];

class jtTello{
    constructor(
        telloID     = 'D2D555',
        telloIP     = '192.168.10.1',
        telloPort   =  8889,
        portCommand =  8050,
        portState   =  8890,
        portStream  = 11111
    ){
        this._telloID     = telloID;
        this._telloSSID   = 'TELLO-' + telloID;
        this._telloIP     = telloIP;
        this._telloPort   = telloPort;
        this._portCommand = portCommand;
        this._portState   = portState;
        this._portStream  = portStream;

        this._lock  = false;
        this._order = [];
        this._osdData = {};

        this._sockCommandReady = false;
        this._sockStateReady = false;

        this._response = [];

        this._sockCommand = null;
        this._sockState = null;
    }

    get response(){
        return this._response;
    }

    get responseReady(){
        return this._response.length;
    }

    async init(){
        let count;

        // init socket with Tello
        this._sockCommand = dgram.createSocket('udp4');
        this._sockState = dgram.createSocket('udp4');

        this._sockCommand.on(
            'message', (msg, info) => this.receiveResponse(msg, info)
        );
        this._sockCommand.on(
            'listening', () => {
                const address = this._sockCommand.address();
                this.log(`sockCommand is listening at ${address.address}:${address.port}`);
                this._sockCommandReady = true;
            }
        );

        this._sockState.on(
            'message', (msg, info) => this.receiveState(msg, info)
        );
        this._sockState.on(
            'listening', () => {
                const address = this._sockState.address();
                this.log(`sockState is listening at ${address.address}:${address.port}`);
                this._sockStateReady = true;
            }
        );

        this._sockCommand.bind(this._portCommand);
        this._sockState.bind(this._portState, '0.0.0.0');

        await sleep.wait(5000, 10, async () => {
            return this._sockCommandReady && this._sockStateReady;
        });
        
        return;
    }

    async connect(id = this._telloID){
        let result = false;
        this._telloID = id;
        this._telloSSID = 'TELLO-' + id;
        const network = await this._wifi.lookup(this._telloSSID);
        if(network){
            this.log((await this._wifi.connect(network)).msg);
            this._telloIP = this._wifi.connectionState.network.ip
            this.log('IP:', this._telloIP);
            this._commServ.on('connection', (sock) => {
                sock.on('message', (message) => {
                    this._onCommServGetMessage(message, this);
                });
                sock.on('close', () => {
                    this._onCommServConnectionClose();
                });
            });
            this._lock = false;
            await this.sendCommand('command');
            await this.sendCommand('command');
            result = true;
        }else{
            this.log('Tello not found');
        }
        return result;
    }

    async _onCommServGetMessage(message){
        let result = false;
        console.log('commServ get msg:', message);
        if(message.indexOf('connect') === 0){
            const id = message.substr(8).trim();
            if(id){
                result = await this.connect(id);
            }else{
                result = await this.connect();
            }
        }else if(message.indexOf('disconnect') === 0){
            result = this.disconnect();
        }else{
            result = await caller.sendCommand(message);
        }
        return result;
    };

    async _onCommServConnectionClose(){
        return await this.disconnect();
    }

    popResponse(){
        let result = null;
        let responseWatchdog = null;
        return new Promise(resolve => {
            responseWatchdog = setInterval( () => {
                if(this.responseReady>0){
                    result = this._response[0];
                    this._response.shift();
                    resolve(result);
                }
            }, 1);
        }).then((result) => {
            clearInterval(responseWatchdog);
            return result;
        });
    }

    receiveState(msg, info){
        msg = msg.toString().trim();
        //console.log(msg);
//        const fieldList = msg.split(';');
//        fieldList.forEach(
//            function(field){
//                let [key, value] = field.split(':');
//                this._osdData[key] = value;
//            }
//        )
    }

    receiveResponse(msg, info){
        this._response.push(msg.toString());
    }

    async sendCommand(command){
        let result = false;
        if(!this._lock){
            if(JTTELLO_PASS_COMMANDS.indexOf(command) >= 0){
                return;
            }
            const message = Buffer.from(command);
            this.log('send:', command);
            this._lock = true;
            try{
                await this._sockCommand.send(message, 0, message.length,
                    this._telloPort, this._telloIP,
                    function(err){
                        if(err){
                            throw err;
                        }
                    }
                );
                result = await this.popResponse();
                this.log('recv:', result);
            }catch(e){
                this.log('submitCommand error: ', e);
            }
            this._lock = false;
        }
        return result;
    }

    async disconnect(){
        let result = false;
        try{
            await this._sockCommand.close();
            await this._sockState.close();
            this._sockCommand = null;
            this._sockState = null;
            result = await this._wifi.disconnect();
        }catch(e){
            result = e;
        }
        return result;
    }

    async destruct(){
        return await this._commServ.close();
    }

    log(msg, ...msgs){
        if(msgs.length){
            console.log(msg, msgs[0]);
        }else{
            console.log(msg);
        }
    }
}


//  const server = new websock();
//  const client = new websock();
//  await server.createServer(undefined, testServer);
//  await client.createClient();
//  await sleep(1000);
//  await client.request('Hi from client!');
//  await sleep(1000);
//  await client.closeClient();
//  await sleep(1000);
//  await server.closeServer();

//function testServer(message){
//  console.log('test:', message);
//}




module.exports = jtTello;