/**
 * @file the factory to create jtDevices
 *      jtDeviceFactory.js
 * @module ./jtDevice/jtDeviceFactory
 * @version 0.00.191023a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;

const DevTypeList = {
    logger: require('./jtDevLog'),
    server: require('./jtDevServ')
}

class jtDeviceFactory{
    /**
     * - create a jtDevice
     * @param {DevTypeList} devType - one of Object.keys(DevTypeList)
     * @param {object} argv - arguments for device constructor
     * @returns {boolean|string} - jtDevice UUID or false
     */
    static async create(devType = null, argv = {}){
        let result = false;
        let object = null;
        if(DevTypeList[devType] !== undefined){
            object = new DevTypeList[devType](argv);
            if(argv.init){
                result = await object.init(argv.init);
            }else{
                result = await object.init();
            }
            if(result){
                result = object.uuid;
            }
        }
        return result;
    }

    /**
     * - list of device type
     * @returns {string[]} device types
     */
    static getDeviceTypes(){
        return Object.keys(DevTypeList);
    }

    /**
     * check device type name
     * @param {string} devType - device type name
     * @returns {boolean} available or unavailable
     */
    static hasDeviceType(devType = null){
        let result = false;
        if(devType && DevTypeList[devType] !== undefined){
            result = true;
        }
        return result;
    }
}

module.exports = jtDeviceFactory;
