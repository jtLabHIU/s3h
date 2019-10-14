/**
 * @file jtS3H - jtLab Scratch 3.0 Helper
 *      startup.js
 * @version 1.00.191011c
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

const {app, BrowserWindow, Menu, Tray} = require('electron');
const sleep = require('./jtSleep');
const WSR = require('./jtWebSockRepeater');

let mainWindow = null;
let tray = null;
let repeater = null;

app.on('window-all-closed', () => {});

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    'min-width': 640,
    'min-hight': 480,
    'show': false,
    'accept-first-mouse': true,
    icon: 'asset/icon.png'    
  });
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    repeater.close();
    mainWindow = null;
    app.quit();
  });

  tray = new Tray('./asset/icon.png');
  var contextMenu = Menu.buildFromTemplate([
      { label: 'exit', click(menuItem){ app.quit(); } }
  ]);
  tray.setToolTip('jtS3Helper');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    tray.popUpContextMenu(contextMenu);
    //mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
});

startCommServ();
/*
  // Tello WiFi direct
  const tello = new jtTello('D2D555', '192.168.10.1', 8889, );
  await tello.init({wifi:true});
  tello.connect({wifi:true});

  await sleep(2000);

  await tello.sendCommand('command');
  await tello.sendCommand('sdk?');
  await tello.sendCommand('battery?');
  await sleep(2000);
  //await tello.sendCommand('ap ETROBO etrobocon_hkd');
  await tello.sendCommand('takeoff');
  await tello.sendCommand('flip f');
  await tello.sendCommand('land');
*/

async function startCommServ(){
  repeater = new WSR({portComm:5963});
  repeater.addDeviceInfo(
      {
          'name': 'D2D555',
          'ssid': 'TELLO-D2D555',
          'mac': 'D2D555',
          'ip': '192.168.10.1',
          'port': {'udp':8889},
          'via': {'udp':8889},
          'downstream': [{'udp':8890}, {'udp':11111}]
      }
  );
  repeater.init();
  return;
}
