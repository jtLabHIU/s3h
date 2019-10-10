const {app, BrowserWindow, Menu, Tray} = require('electron');
const jtTello = require('./jtTello');
const sleep = require('./jtSleep');

let mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    'min-width': 640,
    'min-hight': 480,
    'accept-first-mouse': true,
    show: false,
    icon: './asset/icon.png'    
  });
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  var appIcon = null;
  appIcon = new Tray('./asset/icon.png');
  var contextMenu = Menu.buildFromTemplate([
      { label: 'Restore', type: 'radio' }
  ]);
  appIcon.setToolTip('Electron.js App');
  appIcon.setContextMenu(contextMenu);

  appIcon.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  });
  mainWindow.on('show', () => {
    //mainWindow.setHighlightMode('always')
  });
  mainWindow.on('hide', () => {
    //mainWindow.setHighlightMode('never')
  });
  flyTello();
});

 
async function flyTello(){
  // Tello Edu via AP
  //const tello1 = new jtTello('FCA4FF', '172.17.11.3', 8889, 8050);
  //await tello1.init({wifi:false});
  //tello1.connect({wifi:false});
  //const tello2 = new jtTello('FCA00D', '172.17.11.4', 8889, 8051);
  //await tello2.init({wifi:false});
  //tello2.connect({wifi:false});
  //const tello3 = new jtTello('FCA16C', '172.17.11.5', 8889, 8052);
  //await tello3.init({wifi:false});
  //tello3.connect({wifi:false});

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

  return
}
