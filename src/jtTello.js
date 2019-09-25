/*******************************
 jtTello.js Ver 0.00.190925a
 oriinal Tello.js script
 by http://www.ryzerobotics.com 
********************************/

const http = require('http');
const sleep = require('sleep-async')().Promise;
const dgram = require('dgram');

const JTTELLO_DIRECT_COMMANDS = ['emergency', 'rc', 'command'];
const JTTELLO_PASS_COMMANDS = ['reset_all'];

class jtTello{
    constructor(telloIP     = "192.168.10.1",
                telloPort   =  8889,
                portCommand =  8050,
                portState   =  8890,
                portStream  = 11111,
                portComm    =  5963){
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

        this._sockCommand = dgram.createSocket('udp4');
        this._sockCommand.bind(portCommand);
        this._sockCommand.on(
            'message', (msg, info) => this.receiveResponse(msg, info)
        );
        this._sockCommand.on(
            'listening', () => {
                const address = this._sockCommand.address();
                console.log(`sockCommand is listening at ${address.address}:${address.port}`);
                this._sockCommandReady = true;
            }
        );

        this._sockState = dgram.createSocket('udp4');
        this._sockState.bind(this._portState, '0.0.0.0');
        this._sockState.on(
            'message', (msg, info) => this.receiveState(msg, info)
        );
        this._sockState.on(
            'listening', () => {
                const address = this._sockState.address();
                console.log(`sockState is listening at ${address.address}:${address.port}`);
                this._sockStateReady = true;
            }
        );
    }

    isListenerReady(){
        return this._sockCommandReady && this._sockStateReady;
    }

    waitListenerReady(timeout = 5000, interval = 50){
        let result = false;

        const options = {
            sleep: timeout,
            interval: interval
        };

        sleep.sleepWithCondition(() => {
            if(this.isListenerReady()){
                result = true;
                console.log('resolve:', result);
                return result;
            }
        }, options)
        .then(() => {
            console.log('then:', result);
            return result;
        });

//        setTimeout(() => {
//            if(this.isListenerReady()){
//                result = true;
//            }
//            console.log(result);
//        }, timeout);
//        console.log(result);
//        return result;
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

    receiveResponse(msg, info){
        console.log('Response: ' + msg.toString());
        if(msg.toString() === 'ok'){
			console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);
			if(this._order.length){
				this._order = this._order.splice(1);
			}
			this.submitNext();
		}else{ 
			this._order = [];
			this._lock = false;
		}
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
}

module.exports = jtTello;