/**
 * @file `child-process` and `sync-exec` module wrapper for non-english Windows
 *      jtShell.js
 * @module ./jtShell
 * @version 1.00.200130a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2020 jtLab, Hokkaido Information University
 * 
 */

const child_process = require('child_process');
const sync_exec = require('sync-exec');
const iconv = require('iconv-lite');

/**
 * - defaultOptions
 *  default options for all child_process methods
 * @typedef {object} defaultOptions
 * @property {string} cwd - current working directory of the child process
 */
const _defaultOptions = {
    cwd: process.env.temp,
}

/**
 * - codepage before init
 * @type {Number}
 */
var _codepageBeforeInit = 932;

/**
 * - current codepage
 * @type {Number}
 */
var _codepage = 932;

/**
 * - character type for stdout
 * @type {string}
 */
var _encoding = 'utf8';

/**
 * merge specific options and default options
 * @param {object} [options] 
 */
function _mergeOptions(options = {}){
    let result = options;
    if(result === null){
        result = {};
    }

    for(let key in _defaultOptions){
        if(result.hasOwnProperty(key)){
            result[key] = _defaultOptions[key]
        }
    }
    return result;
}

/**
 * module initialize
 * @param {Number} [codepage] - codepage for child process 
 * @param {string} [encoding] - character type for stdout
 */
function init(codepage = _codepage, encoding = _encoding){
    _codepageBeforeInit = getCurrentCodepage();
    _codepage = _codepageBeforeInit;
    if(codepage != _codepage){
        if(changeCodepage(codepage)){
            _codepage = codepage;
        }
    }
    _encoding = encoding;
}

/**
 * change codepage
 * @param {Number} codepage
 * @returns {boolean} - returns true if successed
 */
function changeCodepage(codepage = null){
    let result = false;
    if(codepage){
        try{
            execSync('chcp ' + codepage);
        }catch(e){}
        if(getCurrentCodepage() == codepage){
            result = true;
        }
    }
    return result;
}

/**
 * get current codepage by using chcp command
 * @returns {Number|null} - current codepage, returns null when an error is occured
 */
function getCurrentCodepage(){
    let result = null;
    const stdout = execSync('chcp');
    if(stdout){
        const pos = stdout.lastIndexOf(' ');
        if(pos<0){
            result = null;
        }else{
            const Number = stdout.substring(pos+1);
            if(Number && isNaN(Number)){
                result = null;
            }else{
                result = parseInt(Number);
            }
        }
    }
    return result;
}

/**
 * codepage translation
 * @param {string|Buffer} source - translation string 
 * @param {Number|string} [codepage] - decode from: codepage Number or 'utf8'
 * @param {string} [encoding] - encode to
 */
function transCodepage(source, codepage = _codepage, encoding = _encoding){
    let cp = 'cp' + codepage;
    if(codepage == 65001 || codepage == 'utf8'){
        cp = 'utf8';
    }
    const buf = Buffer.from(source);
    const dec = iconv.decode(buf, cp);
    const enc = iconv.encode(dec, encoding);
    return enc.toString();
}

/**
 * wrapped execSync
 * @param {string} command - the command to run
 * @param {object} [options] - specific options
 * @returns {Buffer|string} - stdout
 */
function execSync(command, options = null){
    return transCodepage(child_process.execSync(command, _mergeOptions(options)));
}

/**
 * wrapped `sync-exec`
 * @param {string} command - the command to run
 * @param {Number} [timeout] - milli-seconds to time out
 * @param {object} [options] - specific options
 * @returns {object} 
 */
function syncExec(command, arg_timeout = null, arg_options = null){
    let result = {};
    let timeout = arg_timeout;
    let options = arg_options;
    if(arg_timeout && typeof arg_timeout === 'object'){
        timeout = arg_options;
        options = arg_timeout;
    }
    if(options === null){
        options = {};
    }

    console.log('timeout:', timeout, ' options:', options);

    if(timeout === null){
        result = sync_exec(command, _mergeOptions(options));
    }else{
        result = sync_exec(command, timeout, _mergeOptions(options));
    }
    result.stdout = transCodepage(result.stdout);
    result.stderr = transCodepage(result.stderr);
    return result;
}

module.exports = {
    init,
    execSync,
    syncExec,
    changeCodepage,
    getCurrentCodepage,
    transCodepage
};
