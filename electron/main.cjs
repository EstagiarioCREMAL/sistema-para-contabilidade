const { app, BrowserWindow } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Se o app estiver empacotado, carrega os arquivos locais gerados. Se não, tenta o servidor local.
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
    
    // Verifica e notifica atualizações automaticamente
    autoUpdater.checkForUpdatesAndNotify();
  } else {
    win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
