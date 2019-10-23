/**
 * @file jtDevice: logger device
 *      jtDevLog.js
 * @module ./jtDevice/jtDevLog
 * @version 0.00.191021a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;

const Minilog = require('minilog');
const Device = require('./jtDevice');

const _loggers = [];
class jtDevLog extends Device{
    constructor(argv = {}){
        super('logger', argv);
        this._namespace = null;
        if(argv.namespace){
            this._namespace = argv.namespace;
        }
        _loggers.push(this);
    }

    async init(argv = {}){
        try{
            if(this._namespace){
                this._minilog = await Minilog(this._namespace)
            }else{
                this._minilog = await Minilog();
            }
            await Minilog.enable();
            return true;
        }catch(e){
            return false;
        }
    }

    out(arg, ...args){
        console.log(arg, ...args);
    }
}

module.exports = jtDevLog;