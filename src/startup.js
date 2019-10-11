const {app, BrowserWindow, Menu, Tray} = require('electron');
const sleep = require('./jtSleep');
const WSR = require('./jtWebSockRepeater');
const WSC = require('./jtWebSockClient');

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
  });
  mainWindow.on('hide', () => {
    //mainWindow.setHighlightMode('never')
  });
  flyTello();

});



async function flyTello(){
  let result = null;
  let repeater = new WSR({portComm:5963});
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
  await repeater.init();

  repeater.removeDeviceInfo('D2D555');

  let client = new WSC({portComm:5963});
  await client.init();
  await client.request('connect', 'module');
  result = await client.request('command');
  if(result.message !== 'ok'){
      await client.request('command');
  }
  await client.request('battery?');
  await client.request('sdk?');
  await client.request('takeoff');
  await client.request('flip f');
  await client.request('land');
  repeater.close();
return
}
