const {app, BrowserWindow, Menu, Tray} = require('electron');
const jtTello = require('./jtTello');

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
    appIcon.setHighlightMode('always')
  });
  mainWindow.on('hide', () => {
    appIcon.setHighlightMode('never')
  });

  const tello = new jtTello();
  tello.waitListenerReady();
  console.log('ListenerReady');

  setTimeout(() => {
    tello.sendCommand('command');
    setTimeout(() => {
      tello.sendCommand('takeoff');
      setTimeout(() => {
        tello.sendCommand('land');
      }, 2000);
    }, 2000);
  }, 2000);
  
});