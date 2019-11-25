/**
 * @file jtDevice: RESTful HTTP Server
 *      jtDevREST.js
 * @module ./jtDevice/jtDevREST
 * @version 0.00.191124a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;
const http = require('http');
const url = require('url');
const path = require('path');
const sleep = require('./jtSleep');

class jtDevREST{
    constructor(acceptPort = 4989, apiRoot = '/jtDev'){
        this._acceptPort = acceptPort;
        this._apiRoot = apiRoot;
        this._endPoints = {};

        this._http = http.createServer( (request, response) => {
            this._httpServer(request, response);
        });
        this._http.listen(this._acceptPort);
    }

    get port(){
        return this._acceptPort;
    }

    get apiRoot(){
        return this._apiRoot;
    }

    async _httpServer(request, response){
        const requestUrl = url.parse(request.url, true);
        const endpoint = path.dirname(requestUrl.pathname);
        const method = path.basename(requestUrl.pathname);
//        if( request.method == 'GET' && endpoint == HTTP_END_POINT){
        if(this._endPoints.hasOwnProperty(method)){
                console.log('accept method:', method);
                response.writeHead(200, 'OK', {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                });
//                const result = await this.read('magnetometerBearing');
//                const degree = result[0] + result[1]*256;
                response.write(await this._endPoints[method].callback(method, requestUrl.query, this._endPoints[method].target));
                response.end();
        }
    }

    async createEndPoint(service = null, target = null, callback = null){
        if(service){
            this._endPoints[service] = {
                'endPoint': this._apiRoot + '/' + service,
                'target': target,
                'callback': async (method, query, target) => {
                    //console.log('invoke:', method, query);
                    return await target.read(method);
                }
            };
        }
    }

}

module.exports = jtDevREST;
