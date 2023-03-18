// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const keccak = require('keccak');
const path = require('path');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
  })
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

app.on('activate', function () {
  if (mainWindow === null) createWindow()
});

ipcMain.on('download', (event, url) => {
  https.get(url, (response) => {
    let data = '';

    // Get the total length of the response data
    const totalLength = response.headers['content-length'];

    response.on('data', (chunk) => {
      data += chunk;

      // Calculate the percentage progress and emit it to the renderer process
      const percentComplete = ((data.length / totalLength) * 100).toFixed(2);
      event.sender.send('progress', percentComplete);
    });

    response.on('end', () => {
      const words = data.split('\n');
      const rows = [];

      for (let i = 0; i < words.length; i++) {
        const word = words[i];

        const keccakHash = keccak('keccak256').update(word).digest('hex');
        const shaHash = crypto.createHash('sha256').update(word).digest('hex');
        rows.push(`${word},${keccakHash},${shaHash}`);
      }

      fs.writeFileSync('hashed-parsed.csv', rows.join('\n'));
      event.sender.send('complete');
      mainWindow.close();
    });
  });
});
