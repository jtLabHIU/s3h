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
const websock = require('./jtWebSocket');

const JTTELLO_DIRECT_COMMANDS = ['emergency', 'rc', 'command'];
const JTTELLO_PASS_COMMANDS = ['reset_all'];

const JTTELLO_STATE = {
    INIT: 0,
    SOCK_READY: 1,
    CONNECTED: 2,
    WAIT_RESPONSE: 3,
    DISCONNECTED: 4
};

class jtTello{
    constructor(telloSSID   = 'TELLO-D2D555',
                telloIP     = '192.168.10.1',
                telloPort   =  8889,
                portCommand =  8050,
                portState   =  8890,
                portStream  = 11111,
                portComm    =  5963){
        
        this._state = JTTELLO_STATE.INIT;
        
        this._telloSSID   = telloSSID
        this._telloIP     = telloIP;
        this._telloPort   = telloPort;
        this._portCommand = portCommand;
        this._portState   = portState;
        this._portStream  = portStream;
        this._portComm    = portComm;

        this._lock  = false;
        this._order = [];
        this._osdData = {};

        this._sockCommandReady = false;
        this._sockStateReady = false;

        this._response = [];

        this._sockCommand = null;
        this._sockState = null;

        this.wifi = new wifi();
        this.commServ = new websock();
    }

    async init(){
        let result = false;
        this._lock = false;
        this._sockCommand = dgram.createSocket('udp4');
        this._sockState = dgram.createSocket('udp4');

        this._sockCommand.on(
            'message', (msg, info) => this.receiveResponse(msg, info)
        );
        this._sockCommand.on(
            'listening', () => {
                const address = this._sockCommand.address();
                console.log(`sockCommand is listening at ${address.address}:${address.port}`);
                this._sockCommandReady = true;
                if(this.isListenerReady()){
                    this._state = JTTELLO_STATE.SOCK_READY;
                }
            }
        );

        this._sockState.on(
            'message', (msg, info) => this.receiveState(msg, info)
        );
        this._sockState.on(
            'listening', () => {
                const address = this._sockState.address();
                console.log(`sockState is listening at ${address.address}:${address.port}`);
                this._sockStateReady = true;
                if(this.isListenerReady()){
                    this._state = JTTELLO_STATE.SOCK_READY;
                }
            }
        );

        this._sockCommand.bind(this._portCommand);
        this._sockState.bind(this._portState, '0.0.0.0');

        await this.commServ.createServer(this._portComm);

        let count;
        if(count = await this.wifi.init()){
            console.log('ap:', count);
        }else{
            console.log('WiFi down...');
        }
        const network = await this.wifi.lookup('TELLO-D2D555');
        if(network){
            console.log('connect:', await this.wifi.connect(network));
            console.log(this.wifi.connectionState.network);
            result = true;
        }else{
            console.log('Tello not found');
        }
        return result;
    }

    get state(){
        return this._state;
    }

    get response(){
        return this._response;
    }

    get responseReady(){
        return this._response.length;
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

    isListenerReady(){
        return this._sockCommandReady && this._sockStateReady;
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
        let result = true;
        if(!this._lock){
            if(JTTELLO_PASS_COMMANDS.indexOf(command) >= 0){
                return;
            }
            const message = Buffer.from(command);
            console.log('send:', command);
            this._lock = true;
            await this._sockCommand.send(message, 0, message.length,
                this._telloPort, this._telloIP,
                function(err){
                    if (err){
                        console.log('submitCommand error: ', err);
                        throw err;
                    }
                }
            );
            console.log('popResponse:', await this.popResponse());
            this._lock = false;
        }else{
            result = false;
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
            await this.commServ.closeServer();
            result = await this.wifi.disconnect();
        }catch(e){
            result = e;
        }
        return result;
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