const { app, BrowserWindow } = require("electron");
const log = require("electron-log");

// Redirige console.log / console.error / etc. vers userData/logs/main.log,
// en plus du terminal quand il y en a un.
Object.assign(console, log.functions);

// Blob is not available in the global scope in Electron 28.
// This is a workaround to make Blob available in the global scope.
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = require('node:buffer').Blob;
}

// Rend le chemin userData visible au serveur Express (chargé ci-dessous).
// Doit être positionné AVANT le require('./server'), sinon paths.js retombera
// sur les dossiers du bundle (lecture seule en prod).
process.env.MENOUCHAT_USER_DATA = app.getPath("userData");

// Amorce userData/db, userData/images, userData/files avec les fichiers
// par défaut du bundle au premier lancement.
const { seedUserData } = require("./paths");
seedUserData();

require("./app");
const server = require("./server");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: "./public/clock.ico",
    webPreferences: {
      nodeIntegration: true,
    },
  });

  secondWindow = new BrowserWindow({
    width: 540,
    height: 960,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  secondWindow.loadURL("http://localhost:3000/shoul");
  secondWindow.on("closed", function () {
    secondWindow = null;
  });

  mainWindow.loadURL("http://localhost:3000");
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch("lang", "fr");

app.on("ready", createWindow);

app.on("resize", function (e, x, y) {
  mainWindow.setSize(x, y);
  secondWindow.setSize(x, y);
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
