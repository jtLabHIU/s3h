/**
 * @file jtDevice: logger
 *      jtDevLog.js
 * @module ./jtDevice/jtDevLog
 * @version 0.00.191021a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;

const Device = require('./jtDevice');

class jtDevLog extends Device{
    out(arg, ...args){
        console.log(arg, ...args);
    }
}

module.exports = jtDevLog;