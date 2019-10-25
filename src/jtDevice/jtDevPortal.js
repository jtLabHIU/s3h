/**
 * @file jtDevice: portal device
 *      jtDevPortal.js
 * @module ./jtDevice/jtDevPortal
 * @version 0.00.191025a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;

const Device = require('./jtDevice');

const PortTypeList = {
    tcp: 'TCP/IP',
    udp: 'UDP/IP',
    ipc: 'IPC',
    
}