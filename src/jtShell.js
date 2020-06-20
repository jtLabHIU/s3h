/**
 * @file part of `child-process` and `sync-exec` and `fs` module wrapper class for non-english Windows
 *      jtShell.js
 * @module ./jtShell
 * @version 2.20.200327a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2020 jtLab, Hokkaido Information University
 * 
 * ** IMPORTANT WARNING **
 * for Non-English Windows environment users:
 * modules that using Windows command aren't work well on non-english codepage.
 * please change to `const child_process_1 = require("../../../../src/jtShell");`
 * of `node-modules/@network-utils/arp-lookup/dist/index.js` line 11
 * please change to `var cp = require('../../../src/jtShell');`
 * of `node-modules/ping/lib/ping-promise.js` line 15
 * 
 * @todo now spawn() doesn't through transCodepage()
 * @todo ya, transCodepage(), we should make as pipe.
 * 
 * you can use option with syncExec() :
 * decodePage: codepage which decoding 
 * 
 */
/** */

const __DEBUG__ = false;

const { logger } = require('./jtDebugConsole');
const child_process = require('child_process');
const sync_exec = require('sync-exec');
const fs = require('fs');
const iconv = require('iconv-lite');
const chcp = 'chcp';

/**
 * - defaultOptions
 *  default options for all child_process methods
 * @typedef {object} defaultOptions
 * @property {string} cwd - current working directory of the child process
 */
const _defaultOptions = {
    cwd: process.env.temp,
    encoding: 'buffer'
}

class jtShell{
    /**
     * module initialize
     * @param {number} [codepage] - codepage for child process 
     * @param {string} [encoding] - character type for stdout, usually 'utf8' or 'buffer'
     * @param {object} [options] - default options for exec a child process
     */
    constructor(codepage = null, encoding = 'utf8', options = _defaultOptions){
        /**
         * - character type for stdout
         * @type {string}
         */
        this._encoding = encoding;

        /**
         * - default options for exec a child process
         * @type {object}
         */
        this._options = _defaultOptions;
        this._options = this._mergeOptions(options);

        /**
         * - current codepage
         * @type {number}
         */
        this._codepage = 932;

        /**
         * - codepage before init
         * @type {number}
         */
        this._codepageBeforeInit = this.getCurrentCodepage();

        this._codepage = this._codepageBeforeInit;
        if(codepage != this._codepage){
            if(this.changeCodepage(codepage)){
                this._codepage = codepage;
            }
        }
    }

    /**
     * merge specific options and default options
     * @param {object} [options] 
     */
    _mergeOptions(options = {}){
        let result = options;
        if(result === null){
            result = {};
        }

        for(let key in this._options){
            if(!result.hasOwnProperty(key)){
                result[key] = this._options[key]
            }
        }
        return result;
    }

    /**
     * is Win32
     * @returns {boolean} true if this platform is Win32
     */
    isWin32(){
        let result = false;
        if(process.platform === 'win32'){
            result = true;
        }
        return result;
    }

    /**
     * change or get working directory as default
     * @param {string} dir
     * @returns {string} current working directory 
     */
    cwd(dir = null){
        if(dir){
            this._options.cwd = dir;
        }
        return this._options.cwd
    }

    /**
     * get temporary directory on the child process
     * @returns {string}
     */
    temp(){
        return process.env.temp;
    }

    /**
     * change codepage
     * @param {number} codepage
     * @returns {boolean} - returns true if successed
     */
    changeCodepage(codepage = null){
        let result = false;
        if(codepage){
            if(this.getCurrentCodepage(codepage) == codepage){
                this._codepage = codepage;
                result = true;
            }
        }
        return result;
    }

    /**
     * get current codepage by using chcp command
     * @param {number} [codepage]
     * @returns {number|null} - current codepage, returns null when an error is occured
     */
    getCurrentCodepage(codepage = null){
        let result = null;
        let cp = '';
        if(codepage){
            cp = ' ' + codepage;
        }
        const response = this.syncExec(chcp + cp);
        if(response.status){
            result = false;
        }else{
            result = this._parseCodepage(response.stdout);
            if(!result){
                result = false;
            }
        }
        return result;
    }

    _parseCodepage(stdout){
        let result = null;
        if(stdout){
            const pos = stdout.lastIndexOf(' ');
            if(pos<0){
                result = null;
            }else{
                const num = stdout.substring(pos+1);
                if(num && isNaN(num)){
                    result = null;
                }else{
                    result = parseInt(num);
                }
            }
        }
        return result;
    }

    _getLineFromBuffer(buffer){
        const buf = Buffer.from(buffer);
        const result = {
            line: '',
            lineBuffer: buf,
            buffer: buf
        };
        const pos_r = buf.indexOf('\r');
        const pos_n = buf.indexOf('\n');
        let pos = 0;
        let nlBytes = 0;
        if(pos_r>=0 || pos_n>=0){
            if(pos_r<pos_n){
                pos = pos_n;
            }else{
                pos = pos_r;
            }
            if(pos_r == pos_n - 1){
                nlBytes = 1;
            }
        }
        result.lineBuffer = Buffer.allocUnsafe(pos - nlBytes);
        buf.copy(result.lineBuffer, 0, 0, pos - nlBytes);
        result.buffer = Buffer.allocUnsafe(buf.length - (pos + nlBytes));
        buf.copy(result.buffer, 0, pos + nlBytes);
        result.line = this.transCodepage(result.lineBuffer);
        return result;
    }

    /**
     * codepage translation
     * @param {string|Buffer} arg_source - translation string 
     * @param {number|string} [arg_codepage] - decode from: codepage number or 'utf8'
     * @param {string} [encoding] - encode to
     * @returns {string}
     */
    transCodepage(arg_source, arg_codepage = null, encoding = this._encoding){
        let codepage = null;
        let source = null;
        if(typeof arg_source === 'object' && arg_source.hasOwnProperty('line')){
            codepage = this._parseCodepage(arg_source.line);
            source = arg_source.buffer;
        }else{
            source = arg_source;
        }
        if(arg_codepage){
            codepage = arg_codepage;
        }else if(!codepage){
            codepage = this._codepage;
        }
        let cp = 'cp' + codepage;
        if(codepage == 65001 || codepage == 'utf8'){
            cp = 'utf8';
        }
        const buf = Buffer.from(source);
        const dec = iconv.decode(buf, cp);
        const enc = iconv.encode(dec, encoding);
        if(__DEBUG__){
            logger.log('buf:', buf);
            logger.log('dec:', dec, cp);
            logger.log('enc:', enc, encoding);
            logger.log('結果:', enc.toString());
        }

        return enc.toString();
    }

    /**
     * wrapped execSync
     * @param {string} arg_command - the command to run
     * @param {object} [options] - specific options
     * @returns {Buffer|string} - stdout
     */
    execSync(arg_command, options = null){
        const command = arg_command;
        return transCodepage(this._getLineFromBuffer(child_process.execSync(command, this._mergeOptions(options))));
    }

    /**
     * wraped exec
     * @param {string} arg_command - the command to run
     * @param {object} [arg_options] - specific options
     * @param {funcrion} [arg_callback] - called with the output when process terminates, error/stdout/stderr
     * @returns {ChildProcess} 
     */
    exec(arg_command, arg_options = null, arg_callback = null){
        let result = null;
        let options = null;
        let callback = null;
        const command = '"' + chcp + '" ' + this._codepage + ' & ' + arg_command;
        if(arg_options){
            if(typeof arg_options === 'function'){
                callback = arg_options;
            }else{
                options = arg_options;
            }
        }
        if(arg_callback){
            callback = arg_callback;
        }
        if(options === null){
            options = {};
        }

        options = this._mergeOptions(options);

        if(callback){
            result = child_process.exec(command, options, (error, stdout, stderr) => {
                if(error){
                    error.message = this.transCodepage(error.message);
                }
                callback(error, this.transCodepage(this._getLineFromBuffer(stdout)), this.transCodepage(stderr));
            });
        }else{
            result = child_process.exec(command, options);
        }
        return result;
    }

    /**
     * wraped spawn
     * @param {string} arg_command - the command to run
     * @param {string[]} [arg_args] - list of string arguments
     * @param {object} [arg_options] - specific options
     * @returns {ChildProcess} 
     */
    spawn(arg_command, arg_args = null, arg_options = null){
        let result = null;
        let args = null;
        let options = null;
        const command = '"' + chcp + '" ' + this._codepage + ' & "' + arg_command + '"';
        if(arg_args){
            if(Array.isArray(arg_args)){
                args = arg_args;
            }else{
                options = arg_args;
            }
        }
        if(arg_options){
            options = arg_options;
        }
        if(options === null){
            options = {};
        }

        options = this._mergeOptions(options);

        if(args){
            result = child_process.spawn(command, args, options);
        }else{
            result = child_process.exec(command, options);
        }
        return result;
    }

    /**
     * wrapped `sync-exec`
     * @param {string} command - the command to run
     * @param {number} [timeout] - milli-seconds to time out
     * @param {object} [options] - specific options
     * @returns {object} 
     */
    syncExec(arg_command, arg_timeout = null, arg_options = null){
        let result = {};
        let timeout = arg_timeout;
        let options = arg_options;
        const command = '"' + chcp + '" ' + this._codepage + ' & ' + arg_command;
        if(arg_timeout && typeof arg_timeout === 'object'){
            timeout = arg_options;
            options = arg_timeout;
        }
        if(options === null){
            options = {};
        }
        if(timeout === null){
            result = sync_exec(command, this._mergeOptions(options));
        }else{
            result = sync_exec(command, timeout, this._mergeOptions(options));
        }
        if(options.decodePage){
            result.stdout = this.transCodepage(this._getLineFromBuffer(result.stdout), options.decodePage);
            result.stderr = this.transCodepage(result.stderr, options.decodePage);
        }else{
            result.stdout = this.transCodepage(this._getLineFromBuffer(result.stdout));
            result.stderr = this.transCodepage(result.stderr);
        }
        return result;
    }

    /**
     * wrapped fs.writeFileSync()
     *  - this method write data to temporary directory.
     * @param {string} fileName - (just) file name
     * @param {string|Buffer|TypedArray|DataView} data - data
     * @param {Object|string} options
     * @returns {undefined}
     */
    writeFileSync(fileName, data, options = null){
        let file = fileName;
        if(typeof file === 'string'){
            file = this.temp() + '\\' + fileName;
        }
        if(options){
            fs.writeFileSync(file, data, options);
        }else{
            fs.writeFileSync(file, data);
        }
    }
}

/**
 * default shell instance for using as module
 */
var shell = new jtShell(65001, 'utf8');
function isWin32(){
    return shell.isWin32();
}
function changeCodepage(codepage){
    return shell.changeCodepage(codepage);
}
function getCurrentCodepage(codepage){
    return shell.getCurrentCodepage(codepage);
}
function transCodepage(arg_source, arg_codepage, encoding){
    return shell.transCodepage(arg_source, arg_codepage, encoding);
}
function cwd(dir){
    return shell.cwd(dir);
}
function temp(){
    return shell.temp();
}
function execSync(arg_command, options){
    return shell.execSync(arg_command, options);
}
function syncExec(arg_command, arg_timeout, arg_options){
    return shell.syncExec(arg_command, arg_timeout, arg_options);
}
function exec(arg_command, arg_options, arg_callback){
    return shell.exec(arg_command, arg_options, arg_callback);
}
function spawn(arg_command, arg_args, arg_options){
    return shell.spawn(arg_command, arg_args, arg_options);
}
function writeFileSync(fileName, data, options){
    shell.writeFileSync(fileName, data, options);
}

module.exports = {
    jtShell,
    shell,
    execSync,
    syncExec,
    exec,
    spawn,
    writeFileSync,
    isWin32,
    changeCodepage,
    getCurrentCodepage,
    transCodepage,
    cwd,
    temp
};
