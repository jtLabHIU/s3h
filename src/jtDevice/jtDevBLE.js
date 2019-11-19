/**
 * @file jtDevice: Bluetooth Low Energy
 *      jtDevBLE.js
 * @module ./jtDevice/jtDevBLE
 * @version 0.00.191116a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;
const noble = require('@abandonware/noble');
const http = require('http');
const url = require('url');
const path = require('path');
const sleep = require('./jtSleep');

const HTTP_END_POINT   = '/jtDev/ble';
const HTTP_ACCEPT_PORT = 4989;

/**
 * GATT profile
 * @see https://www.bluetooth.com/specifications/gatt/
 */
const _GATT_PROFILE = {
    /**
     * Bluetooth Core Specification - Service Discovery Protocol
     * @see https://www.bluetooth.com/specifications/assigned-numbers/service-discovery/
     * @see https://www.bluetooth.com/specifications/gatt/services/
     */
    sdp: {
        base: {
            uuid: '0000000000001000800000805F9B34FB',
            shortForms: true
        },
        desctiptors: {
            name: 'Client Characteristic Configuration',
            uuid: '2902',
            fields: {
                // bit0: Notifications enable/disable
                // bit1: Indications enable/disable
                'properties': '16bit'
            }
        },
        services: {
            /**
             * Generic Access service 
             * - The generic_access service contains generic information about the device. All available Characteristics are readonly. 	
             */
            'genericAccess': {
                name: 'Generic Access',
                uuid: '1800',
                requirement: 'mandatory',
                characteristics: {
                    /**
                     * Device Name
                     * 
                     * - Read/Write:
                     * 1. Name : utf8s 
                     */
                    'deviceName': {
                        name: 'Device Name',
                        uuid: '2A00',
                        requirement: 'mandatory',
                        'read': 'mandatory',
                        'write': 'mandatory',
                        fields: {
                            'name': 'utf8s'
                        }
                    },
                    /**
                     * Appearance
                     * - The external appearance of this device. The values are composed of a category (10-bits) and sub-categories (6-bits).
                     * 
                     * - Read:
                     * 1. Category : 16bit 
                     */
                    'appearance': {
                        name: 'Appearance',
                        uuid: '2A01',
                        requirement: 'mandatory',
                        'read': 'mandatory',
                        fields:  {
                            'category': '16bit'
                        }
                    },
                    /**
                     * Peripheral Preferred Connection Parameters
                     * 
                     * - Read:
                     * 1. Minimum Connection Interval : uint16
                     * 2. Maximum Connection Interval : uint16
                     * 3. Slave Latency : uint16
                     * 4. Connection Supervision Timeout Multiplier : uint16
                     */
                    'peripheralPreferredConnectionParameters': {
                        name: 'Peripheral Preferred Connection Parameters',
                        uuid: '2A04',
                        requirement: 'mandatory',
                        'read': 'mandatory',
                        fields:  {
                            'connInterval_min': 'uint16',
                            'connInterval_max': 'uint16',
                            'slaveLatency':     'uint16',
                            'connTimeout':      'uint16'
                        }
                    }
                }
            },
            /**
             * Generic Attribute service 
             */
            'genericAttribute': {
                name: 'Generic Attribute',
                uuid: '1801',
                requirement: 'mandatory',
                characteristics: {
                    /**
                     * Service changed
                     * 
                     * - Indicate:
                     * 1. Start of Affected Attribute Handle Range : uint16
                     * 2. End of Affected Attribute Handle Range : uint16
                     * - Descriptors:
                     *  1. Client Characteristic Configuration : 2902
                     */
                    'serviceChanged': {
                        name: 'Service Changed',
                        uuid: '2A05',
                        requirement: 'optional',
                        'indicate': 'mandatory',
                        fields: {
                            'attrHandleRange_start': 'uint16',
                            'attrHandleRange_end':   'uint16'
                        },
                        desctiptors: [ '2902' ]
                    }
                }
            },
            /**
             * Device Information service 
             * - The Device Information Service exposes manufacturer and/or vendor information about a device.
             * - This service exposes manufacturer information about a device.
             *   The Device Information Service is instantiated as a Primary Service.
             *   Only one instance of the Device Information Service is exposed on a device.
             */
            'deviceInformation': {
                name: 'Device Information',
                uuid: '180A',
                requirement: 'mandatory',
                characteristics: {
                    /**
                     * Model Number String
                     * - The value of this characteristic is a UTF-8 string representing the model number assigned by the device vendor. 
                     * 
                     * - Read:
                     * 1. Model Number : utf8s
                     */
                    'modelNumberString': {
                        name: 'Model Number String',
                        uuid: '2A24',
                        requirement: 'optional',
                        'read': 'mandatory',
                        fields: {
                            'modelNumber': 'utf8s'
                        }
                    },
                    /**
                     * Serial Number String
                     * - The value of this characteristic is a variable-length UTF-8 string representing the serial number for a particular instance of the device. 
                     * 
                     * - Read:
                     * 1. Serial Number : utf8s
                     */
                    'serialNumberString': {
                        name: 'Serial Number String',
                        uuid: '2A25',
                        requirement: 'optional',
                        'read': 'mandatory',
                        fields: {
                            'serialNumber': 'utf8s'
                        }
                    },
                    /**
                     * Hardware Revision String
                     * - The value of this characteristic is a UTF-8 string representing the hardware revision for the hardware within the device. 
                     * 
                     * - Read:
                     * 1. Hardware Revision : utf8s
                     */
                    'hardwareRevisionString': {
                        name: 'Hardware Revision String',
                        uuid: '2A27',
                        requirement: 'optional',
                        'read': 'mandatory',
                        fields: {
                            'hardwareRevision': 'utf8s'
                        }
                    },
                    /**
                     * Firmware Revision String
                     * - The value of this characteristic is a UTF-8 string representing the firmware revision for the firmware within the device. 
                     * 
                     * - Read:
                     * 1. Firmware Revision : utf8s
                     */
                    'firmwareRevisionString': {
                        name: 'Firmware Revision String',
                        uuid: '2A26',
                        requirement: 'optional',
                        'read': 'mandatory',
                        fields: {
                            'firmwareRevision': 'utf8s'
                        }
                    },
                    /**
                     * Manufacturer Name String
                     * - The value of this characteristic is a UTF-8 string representing the name of the manufacturer of the device.  
                     * 
                     * - Read:
                     * 1. Manufacturer Name : utf8s
                     */
                    'manufacturerNameString': {
                        name: 'Manufacturer Name String',
                        uuid: '2A29',
                        requirement: 'mandatory',
                        'read': 'mandatory',
                        fields: {
                            type: 'utf8s'
                        }
                    }
                }
            }
        }
    }
}

class jtDevBLE{
    constructor(){
        this._target = null;
        this._services = {};
        this._characteristics = {};
        this._data = {};

        this._http = http.createServer( (request, response) => {
            this._httpServer(request, response);
        });
        this._http.listen(HTTP_ACCEPT_PORT);

        let ready = false;
        sleep.waitPromise(5000, 100, resolve => {
            resolve(noble.state === 'poweredOn');
        })
        .then( ready => {
            if(ready){
                noble.on('stateChange', state => {this._onStateChange(state)});
                noble.on('warning', message => {this._onWarning(message)});
                noble.on('discover', peripheral => {this._onDiscover(peripheral)});
                noble.startScanning();
                console.log('noble ready.');
            } else {
                console.log("BLE adaptor can't initialize.");
            }
        })
        .catch( e => {
            console.log(e);
            console.log("noble can't initialize.");
        });
    }

    static get GATT_PROFILE(){
        return _GATT_PROFILE;
    }

    static addGattProfile(profile){
        if(profile!==undefined && profile!==null && typeof profile == 'object'){
            Object.assign(_GATT_PROFILE, profile);
        }
    }
    
    static getSpecificationProfileFromName(name){
        let result = null;
        for (const specificationName in jtDevBLE.GATT_PROFILE) {
            if (jtDevBLE.GATT_PROFILE.hasOwnProperty(specificationName)) {
                if(specificationName == name){
                    result = jtDevBLE.GATT_PROFILE[specificationName];
                }
            }
        }
        return result;
    }

    static getSpecificationProfileFromUUID(uuid){
        let result = null;
        for (const specificationName in jtDevBLE.GATT_PROFILE) {
            if (jtDevBLE.GATT_PROFILE.hasOwnProperty(specificationName)) {
                const specification = jtDevBLE.GATT_PROFILE[specificationName];
                if(specification.uuid.toLowerCase() == uuid.toLowerCase()){
                    result = specification;
                }
            }
        }
        return result;
    }

    static getServiceProfileFromName(name, specName=null){
        let result = null;
        let profile = jtDevBLE.GATT_PROFILE;
        if(specName){
            profile = jtDevBLE.getSpecificationProfileFromName(specName);
        }
        for (const specificcationName in profile) {
            if (profile.hasOwnProperty(specificcationName)) {
                const specification = profile[specificcationName];
                if(specification.hasOwnProperty('services')){
                    for (const serviceName in specification.services) {
                        if(serviceName == name){
                            result = specification.services[serviceName];
                        }
                    }
                }
            }            
        }
        return result;
    }

    static getServiceProfileFromUUID(uuid, specName=null){
        let result = null;
        let profile = jtDevBLE.GATT_PROFILE;
        if(specName){
            profile = jtDevBLE.getSpecificationProfileFromName(specName);
        }
        for (const specificcationName in profile) {
            if (profile.hasOwnProperty(specificcationName)) {
                const specification = profile[specificcationName];
                if(specification.hasOwnProperty('services')){
                    for (const serviceName in spacification.services) {
                        const service = specification.services[serviceName];
                        if(service.uuid.toLowerCase() == uuid.toLowerCase()){
                            result = service;
                        }
                    }
                }            
            }
        }
        return result;
    }

    _onStateChange(state){
        console.log('onStateChange:', state);
    }

    _onWarninge(message){
        console.log('onWarning:', message);
    }

    _onDiscover(peripheral){
        const name = String(peripheral.advertisement.localName);
        if(name.indexOf('BBC micro:bit') >= 0){
            noble.stopScanning();
            this._target = peripheral;
            this._target.name = peripheral.advertisement.localName;
            console.log(`target found: ${this._target.name} (${this._target.address})`);
            this._target.on('servicesDiscover', services => { this._onServicesDiscover(services) });
            this._target.on('connect', () => { this._target.discoverServices() });
            this._target.connect();
        }
    }

    _onServicesDiscover(discoveredServices){
        discoveredServices.forEach( discoveredService => {
            for(const specificationName in jtDevBLE.GATT_PROFILE){
                const specification = jtDevBLE.GATT_PROFILE[specificationName];
                if(specification.hasOwnProperty('services')) {
                    for(const serviceName in specification.services){
                        const service = specification.services[serviceName];
                        if(service.hasOwnProperty('uuid')){
                            if(discoveredService.uuid == service.uuid.toLowerCase()){
                                this._services[serviceName] = discoveredService;
                                this._services[serviceName].on('characteristicsDiscover', characteristics => {
                                    this._onCharacteristicsDiscover(characteristics, specificationName, serviceName);
                                });
                                this._services[serviceName].discoverCharacteristics();
                            }
                        }
                    }
                }
            }
        });
    }

    _onCharacteristicsDiscover(characteristics, specificationName, serviceName){
        const service = jtDevBLE.GATT_PROFILE[specificationName].services[serviceName];
        characteristics.forEach( characteristic => {
            for(const name in service.characteristics){
                if(service.characteristics.hasOwnProperty(name)) {
                    const uuid = service.characteristics[name].uuid;
                    if(characteristic.uuid == uuid.toLowerCase()){
                        this._characteristics[name] = characteristic;
                        this._characteristics[name].specification = specificationName;
                        this._characteristics[name].service = serviceName;
                        this._characteristics[name].ready = false;
                        this._data[name] = {};
                        this._data[name].ready = false;
                        console.log(`characteristic found: ${service.characteristics[name].name} (${specificationName}.${serviceName}.${name})`);
                        console.log('properties:', characteristic.properties);
                    }
                }
            }
        });
    }

    async _httpServer(request, response){
        console.log('http reauest incoming');
        const requestUrl = url.parse(request.url, true);
        const endpoint = path.dirname(requestUrl.pathname);
        const method = path.basename(requestUrl.pathname);
        if( request.method == 'GET' && endpoint == HTTP_END_POINT){
                response.writeHead(200, 'OK', {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                });
                const result = await this.read('magnetometerBearing');
                const degree = result[0] + result[1]*256;
                response.write(String(degree)); 
                response.end();
        }
    }

    async read(characteristic){
        if(this._characteristics.hasOwnProperty(characteristic)){
            return new Promise( (resolve, reject) => {
                this._characteristics[characteristic].read( (error, data) => {
                    if(error){
                        reject(error);
                    }else{
                        resolve(data);
                    }
                });
            }).then( result => {
                return result;
            }).catch( error => {
                throw error;
            });
        }else{
            return -4989;
        }
    }

    async write(characteristic, data){
        if(this._characteristics.hasOwnProperty(characteristic)){
            return new Promise( (resolve, reject) => {
                this._characteristics[characteristic].write(data, false, error => {
                    if(error){
                        reject(error);
                    }else{
                        resolve();
                    }
                });
            }).then( () => {
                return 0;
            }).catch( error => {
                throw error;
            });
        }else{
            return -4989;
        }
    }

    async getNotify(characteristic){
        if(this._characteristics.hasOwnProperty(characteristic)){
            if(!this._characteristics[characteristic].ready){
                this._characteristics[characteristic].on('data', (data, isNotification) => {
                    this._data[characteristic].rawValue = data;
                    this._data[characteristic].isNotification = isNotification;
                    this._data[characteristic].ready = true;
                });
                this._characteristics[characteristic].subscribe( error => {
                    if(error){
                        console.log(`${characteristic}: subscribe error:`, error);
                    }else{
                        this._characteristics[characteristic].ready = true;
                    }
                });
                await sleep.wait(5000, 1, async ()=>{return this._characteristics[characteristic].ready});
            }
            const ready = await sleep.wait(100, 1, async ()=>{return this._data[characteristic].ready});
            if(ready){
                const result = this._data[characteristic].rawValue;
                this._data[characteristic].ready = false;
                return result;
            }else{
                return -1;
            }
        }else{
            return -4989;
        }
    }
}

/**
 * GATT schema - formats
 * @see http://schemas.bluetooth.org/Documents/formats.xsd
 */
const _GATT_FORMATS = [
    '16bit',
    'utf8s',
    'uint8',
    'uint8[]',
    'uint16',
    'uint24',
    'sint8',
    'sint16'
]

class Characteristic{
    constructor(characteristic, specificationName, serviceName){
        this._target = characteristic;
        this._specification = specificationName;
        this._service = serviceName;
        this._ready = false;
        this._data = {};
        this._data.ready = false;
//        console.log(`characteristic found: ${service.characteristics[name].name} (${specificationName}.${serviceName}.${name})`);
//        console.log('properties:', characteristic.properties);
    }

    /**
     * GATT schema - encode formats
     * @see http://schemas.bluetooth.org/Documents/formats.xsd
     * @param {Buffer} data
     * @returns {any}
     */
    decodeFormats(data, format){
        let result = null;
        let bits = null;
        switch(format){
        case 'boolean':
            result = Boolean(data.readUInt8() & 0x01);
            break;
        case '2bit':
            result = [];
            bits = this.decodeFormats(data, 'uint8');
            result.push(Boolean(bits     & 0x01));
            result.push(Boolean(bits>>>1 & 0x01));
            break;
        case '4bit':
        case 'nible':
            result = [];
            bits = this.decodeFormats(data, 'uint8');
            for (let index = 0; index < 4; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '8bit':
            result = [];
            bits = this.decodeFormats(data, 'uint8');
            for (let index = 0; index < 8; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '16bit':
            result = [];
            bits = this.decodeFormats(data, 'uint16');
            for (let index = 0; index < 16; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '24bit':
            result = [];
            bits = this.decodeFormats(data, 'uint24');
            for (let index = 0; index < 24; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '32bit':
            result = [];
            bits = this.decodeFormats(data, 'uint24');
            for (let index = 0; index < 32; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case 'uint8':
            result = data.readUInt8();
            break;
        case 'uint8[]':
            result = Array.from(data);
            break;
        case 'uint12':
            result = data.readUInt16LE() & 0x0FFF;
            break;
        case 'uint16':
            result = data.readUInt16LE();
            break;
        case 'uint24':
            result = data.readUIntLE(0, 3);
            break;
        case 'uint32':
            result = data.readUInt32LE();
            break;
        case 'uint40':
            result = data.readUIntLE(0, 5);
            break;
        case 'uint48':
            result = data.readUIntLE(0, 6);
            break;
        case 'uint64':
            result = this._readBigUIntLE(data, 8);
            break;
        case 'uint128':
            result = this._readBigUIntLE(data, 16);
            break;
        case 'sint8':
            result = data.readInt8();
            break;
        case 'sint12':
            result = data.readInt16LE() & 0x0FFF;
            break;
        case 'sint16':
            result = data.readInt16LE();
            break;
        case 'sint24':
            result = data.readIntLE(0, 3);
            break;
        case 'sint32':
            result = data.readInt32LE();
            break;
        case 'sint48':
            result = data.readIntLE(0, 6);
            break;
        case 'sint64':
            result = this._readBigIntLE(data, 8);
            break;
        case 'sint128':
            result = this._readBigIntLE(data, 16);
            break;
        case 'utf8s':
        default:
            result = data.toString('utf-8');
            break;
        }
        return result;
    }

    /**
     * GATT schema - encode formats
     * @see http://schemas.bluetooth.org/Documents/formats.xsd
     * @param {any} data
     * @returns {Buffer}
     */
    encodeFormats(data, format){
        let result = null;
        let bits = null;
        switch(format){
        case 'boolean':
            if(data){
                result = Buffer.from([1]);
            }else{
                result = Buffer.from([0]);
            }
            break;
        case '2bit':
            result = [];
            bits = this.decodeFormats(data, 'uint8');
            result.push(Boolean(bits     & 0x01));
            result.push(Boolean(bits>>>1 & 0x01));
            break;
        case '4bit':
        case 'nible':
            result = [];
            bits = this.decodeFormats(data, 'uint8');
            for (let index = 0; index < 4; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '8bit':
            result = [];
            bits = this.decodeFormats(data, 'uint8');
            for (let index = 0; index < 8; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '16bit':
            result = [];
            bits = this.decodeFormats(data, 'uint16');
            for (let index = 0; index < 16; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '24bit':
            result = [];
            bits = this.decodeFormats(data, 'uint24');
            for (let index = 0; index < 24; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case '32bit':
            result = [];
            bits = this.decodeFormats(data, 'uint24');
            for (let index = 0; index < 32; index++) {
                result.push(Boolean(bits>>>index & 0x01));
            }
            break;
        case 'uint8':
            result = data.readUInt8();
            break;
        case 'uint8[]':
            result = Array.from(data);
            break;
        case 'uint12':
            result = data.readUInt16LE() & 0x0FFF;
            break;
        case 'uint16':
            result = data.readUInt16LE();
            break;
        case 'uint24':
            result = data.readUIntLE(0, 3);
            break;
        case 'uint32':
            result = data.readUInt32LE();
            break;
        case 'uint40':
            result = data.readUIntLE(0, 5);
            break;
        case 'uint48':
            result = data.readUIntLE(0, 6);
            break;
        case 'uint64':
            result = this._readBigUIntLE(data, 8);
            break;
        case 'uint128':
            result = this._readBigUIntLE(data, 16);
            break;
        case 'sint8':
            result = data.readInt8();
            break;
        case 'sint12':
            result = data.readInt16LE() & 0x0FFF;
            break;
        case 'sint16':
            result = data.readInt16LE();
            break;
        case 'sint24':
            result = data.readIntLE(0, 3);
            break;
        case 'sint32':
            result = data.readInt32LE();
            break;
        case 'sint48':
            result = data.readIntLE(0, 6);
            break;
        case 'sint64':
            result = this._readBigIntLE(data, 8);
            break;
        case 'sint128':
            result = this._readBigIntLE(data, 16);
            break;
        case 'utf8s':
        default:
            result = data.toString('utf-8');
            break;
        }
        return result;
    }

    /**
     * convert Buffer to Hex String
     * @param {Buffer} data 
     * @param {number} byteLength 
     */
    _readHexLE(data, byteLength){
        let result = '0x';
        for(let i=byteLength-1;i>=0;i--){
            if(data.length<i+1){
                result += '00';
            }else{
                result += data[i].toString(16).padStart(2, '0');
            }
        }
        return result;
    }

    /**
     * caliculate two's complement in Buffer
     * @param {Buffer} data 
     * @param {number} byteLength 
     */
    _2ComplementLE(data, byteLength){
        let carry = true;
        let byte = 0;
        for(let i=0;i<byteLength;i++){
            byte = ~data[i] & 0xFF;
            if(carry){
                byte++;
                if(byte == 256){
                    byte = 0;
                    carry = true;
                }else{
                    carry = false;
                }
            }
            data[i] = byte;
        }
    }

    /**
     * read signed BigInt from Buffer
     * @param {Buffer} data 
     * @param {number} byteLength 
     */
    _readBigIntLE(data, byteLength){
        let result = BigInt(0);
        if(data[byteLength-1]>0x7F){
            this._2ComplementLE(data, byteLength);
            result = -BigInt(this._readHexLE(data, byteLength));
        }else{
            result = BigInt(this._readHexLE(data, byteLength));
        }
        return result;
    }

    /**
     * read unsigned BigInt from Buffer
     * @param {Buffer} data 
     * @param {number} byteLength 
     */
    _readBigUIntLE(data, byteLength){
        return BigInt(this._readHexLE(data, byteLength));
    }
}

module.exports = jtDevBLE;
module.exports.Characteristic = Characteristic;

async function test(){
    //const microbit = new jtDevBLE();
    //console.log('test:', jtDevBLE.getServiceProfileFromName('deviceInformation'));
    const chara = new Characteristic();
    console.log(chara.encodeFormats(true, 'boolean'));
    console.log(chara.encodeFormats(false, 'boolean'));

    //    while(true){
//        const result = await microbit.read('magnetometerBearing');
//        const degree = result[0] + result[1]*256;
//        console.log(degree);
//        if((status != 1) && (status != 2)){    // calibration not requested and calibration not completed ok
//            const request = await microbit.write('magnetometerCalibration', Buffer.from([1]));
//            console.log('calibration request:', request);
//        }
//        const result = await microbit.read('buttonAState');
//        await sleep(500);
//    }
}
test();
