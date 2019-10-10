/*******************************
 jtTello.js Ver 0.00.190925a
 original Tello.js script
 by http://www.ryzerobotics.com 
********************************/

const http = require('http');
const dgram = require('dgram');
const sleep = require('./jtSleep');
const wifi = require('./jtWiFi');

const JTTELLO_DIRECT_COMMANDS = ['emergency', 'rc'];
const JTTELLO_PASS_COMMANDS = ['reset_all'];

const JTTELLO_STATE = {
    INIT: 0,
    SOCK_READY: 1,
    CONNECTED: 2,
    WAIT_RESPONSE: 3,
    DISCONNECTED: 4
};

class jtTello{
    constructor(telloID     = 'D2D555',
                telloIP     = '192.168.10.1',
                telloPort   =  8889,
                portCommand =  0,
                portState   =  8890,
                portStream  = 11111,
                portComm    =  5963){
        
        this._state = JTTELLO_STATE.INIT;
        
        this._telloID     = telloID;
        this._telloSSID   = 'TELLO-' + telloID;
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
        this._responseReady = false;

        this._sockCommand = null;
        this._sockState = null;

        this.wifi = new wifi();
    }

    async init({wifi} = {wifi:true}){
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
                this.log(`sockState is listening at ${address.address}:${address.port}`);
                this._portCommand = address.port;
                this._sockStateReady = true;
                if(this.isListenerReady()){
                    this._state = JTTELLO_STATE.SOCK_READY;
                }
            }
        );

        this._sockCommand.bind(this._portCommand);
        this._sockState.bind(this._portState, '0.0.0.0');
        
        if(wifi){
            await this.wifi.init();
        }
    }

    async connect({wifi = true}){
        if(wifi){
            let count;
            if(count = await this.wifi.init()){
                console.log('ap:', count);
            }else{
                console.log('WiFi down...');
            }
            const network = await this.wifi.lookup(this._telloSSID);
            if(network){
                console.log('connect:', await this.wifi.connect(network));
                console.log(this.wifi.connectionState.network);
            }else{
                console.log('Tello not found');
            }
        
            while(this.wifi.connectionState.connected){
                console.log('running...');
                await sleep(10000);
            }
            this.wifi.disconnect();
        }
    }
    
    getState(){
        return this._state;
    }

    isListenerReady(){
        return this._sockCommandReady && this._sockStateReady;
    }

    receiveResponse(msg, info){
        console.log('Response: ' + msg.toString());
        /*if(msg.toString() === 'ok'){*/
			console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);
			if(this._order.length){
				this._order = this._order.splice(1);
			}
			this.submitNext();
        /*}else{ 
			this._order = [];
			this._lock = false;
		}*/
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

    submitCommand(command){
        const message = Buffer.from(command);
        console.log('send:', command);
        this._sockCommand.send(message, 0, message.length,
            this._telloPort, this._telloIP,
            function(err){
                if (err){
                    console.log('submitCommand: ', err);
                    throw err;
                }
            }
        );
    }

    submitNext(){
        this._lock = true;
        if(this._order.length){
            const command = this._order[0];
            console.log('submitNext: ', command);
            this.submitCommand(command);
        }else{
            console.log('submitNext: [empty]');
            this._lock = false;
        }
    }

    sendCommand(command){
        if(JTTELLO_PASS_COMMANDS.indexOf(command) >= 0){
            return;
        }
        if(JTTELLO_DIRECT_COMMANDS.indexOf(command) >= 0){
            this.submitCommand(command);
            this._order = [];
            return false;
        }
        this._order.push(command);
        !this._lock && this.submitNext();
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

module.exports = jtTello;