const fetch = require('node-fetch');

const getValue = async () => {
    const HOST = 'localhost';
    const PORT = 4989;
    const ENDPOINT = '/jtDev/microbit/target'

    const url = `http://${HOST}:${PORT}${ENDPOINT}`;

    return await fetch(url, {
        method: 'GET',
        mode: 'CORS'/*,
        headers: new Headers()*/
    }).then( response => {
        return response.text();
    });
}

async function test(){
    console.log('result:', await getValue());
}
test();