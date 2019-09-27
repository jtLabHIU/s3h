/****************************
  jtWiFi.js Ver 0.00.190926a
 ****************************/

const wifi  = require('wifi-control');
const sleep = require('./jtSleep');

let _aplist = {
    success: false,
    numofap: 0,
    networks: [],
    msg: 'before scan'
};

let _ifaceState = {
    success: false,
    msg: 'before connect',
    ssid: '',
    connection: 'disconnected',
    power: false
};

class jtWiFi{
    constructor(){
        this._debug = true;
    }

    async init(){
        wifi.init({
            debug: this._debug
        });

        return await this.scan();
    }

    scanForWiFi_Promise(){
        return new Promise( (resolve, reject) => {
            return wifi.scanForWiFi( (err, response) => {
                if(err){
                    reject(err);
                    return;
                }
                resolve(response);
            });
        });
    }

    async scan(){
        let result = false;
        let aplist = _aplist;
        try{
            const response = await this.scanForWiFi_Promise();
            aplist.success = response.success;
            aplist.networks = response.networks;
            aplist.msg = response.msg;
            result = true;
        }catch(e){
            aplist.success = false;
            aplist.msg = err;
            console.log(e);
        }
        _aplist = aplist;
        return result;
    }

    async search(ssid){
        response.networks.filter((item, index)=>{
            if(item.ssid == telloSSID){
                console.log('found', telloSSID);
            }
        });
    }

    async connect(ssid){
        var _ap = {
            ssid: ssid,
        };
        var results = wifi.connectToAP( _ap, function(err, response) {
            if (err) console.log(err);
            console.log(response);
        });
    }
}

module.exports = jtWiFi;