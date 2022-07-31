const {app, BrowserWindow} = require('electron');
const { path } = require('./app');

const server = require('./server');

let mainWindow;

function createWindow () {

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: './public/clock.ico',
    webPreferences: {
      nodeIntegration: true
    }
  })

  secondWindow = new BrowserWindow({
    width: 540,
    height: 960,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  secondWindow.loadURL('http://localhost:3000/shoul')
  secondWindow.on('closed', function () {
    secondWindow = null
  })

  mainWindow.loadURL('http://localhost:3000')
  mainWindow.on('closed', function () {
    mainWindow = null
  })


}

app.commandLine.appendSwitch('lang', 'fr');

app.on('ready', createWindow)

app.on('resize', function(e,x,y){
  mainWindow.setSize(x, y);
  secondWindow.setSize(x, y);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
