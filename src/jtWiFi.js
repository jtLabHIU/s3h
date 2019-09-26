/****************************
  jtWiFi.js Ver 0.00.190926a
 ****************************/

const wifi  = require('wifi-control');

async connectTello(telloSSID){
    let result = JTTELLO_STATE.CONNECTED;
    wifi.scanForWiFi( (err, response) => {
        if (err) console.log(err);
        response.networks.filter((item, index)=>{
            if(item.ssid == telloSSID){
                console.log('found', telloSSID);
                var _ap = {
                    ssid: telloSSID,
                };
                var results = wifi.connectToAP( _ap, function(err, response) {
                    if (err) console.log(err);
                    console.log(response);
                });
            }
        });
    });
//        .then(function(){
//            console.log('try to connect:', telloSSID);
//            wifi.connect({ ssid: telloSSID, password: '' }, (err) => {
//                if(err){
//                    result = JTTELLO_STATE.DISCONNECTED;
//                    console.log('unable to connect');
//                }else{
//                    this._state = result;
//                    console.log('connectTello: ', this._state);
//                }
//                console.log('wificonnectdone');
//            })
//        })
}

