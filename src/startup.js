const {app, BrowserWindow, Menu, Tray} = require('electron');
const jtTello = require('./jtTello');
const sleep = require('./jtSleep');
const jtWebSocket = require('./jtWebSocket');

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
  appIcon.setToolTip('jtS3Helper');
  appIcon.setContextMenu(contextMenu);

  appIcon.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  });
  mainWindow.on('show', () => {
    //mainWindow.setHighlightMode('always')
    flyTello();
  });
  mainWindow.on('hide', () => {
    //mainWindow.setHighlightMode('never')
  });

});



async function flyTello(){
  const tello = new jtTello();
  //const client = new jtWebSocket();
  
  if(await tello.init()){
    //await client.createClient('localhost', 5963);
    //console.log(client._client);
    //await client.request('Hi from startup');
    await tello.sendCommand('command');
    await tello.sendCommand('takeoff');
    await tello.sendCommand('flip f');
    await tello.sendCommand('land');
  }else{
    console.log('can not send commands');
  }
  await tello.disconnect();
  return
}
