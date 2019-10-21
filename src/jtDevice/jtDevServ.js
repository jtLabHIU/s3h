/**
 * @file jtDevice: device server
 *      jtDevServ.js
 * @module ./jtDevice/jtDevServ
 * @version 0.00.191021a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;

const Device = require('./jtDevice');

class jtDevServ extends Device{
    constructor(){
        super();
        this.uuid = Device.uuid;
    }
}

module.exports = jtDevServ;