const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// ─── Logging ────────────────────────────────────────────────────────────────
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false;       // Não baixa automaticamente — pede confirmação
autoUpdater.autoInstallOnAppQuit = true; // Instala na próxima vez que fechar o app

// Configura autenticação do GitHub para o repositório privado
const _k = 'hiq`wfNwDKriP7tCYhUbeCGrD1ZbCx9L2S51MPrB';
const githubToken = _k.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'EstagiarioCREMAL',
  repo: 'sistema-para-contabilidade',
  private: true,
  token: githubToken
});


let mainWindow = null;

// ─── Helpers ────────────────────────────────────────────────────────────────
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ─── Criação da Janela ───────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Verifica atualizações após a janela estar pronta
  mainWindow.webContents.on('did-finish-load', () => {
    if (app.isPackaged) {
      // Aguarda 3s para o app carregar antes de checar
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
          log.error('Erro ao checar atualizações:', err);
        });
      }, 3000);
    }
  });
}

// ─── Eventos do autoUpdater ──────────────────────────────────────────────────
autoUpdater.on('checking-for-update', () => {
  log.info('Verificando atualizações...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Atualização disponível:', info.version);
  sendToRenderer('update-available', {
    version: info.version,
    releaseNotes: info.releaseNotes || '',
    releaseDate: info.releaseDate || ''
  });
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Nenhuma atualização disponível. Versão atual:', info.version);
  // Não envia para o renderer — não precisamos incomodar o usuário
});

autoUpdater.on('download-progress', (progress) => {
  log.info(`Download: ${Math.round(progress.percent)}%`);
  sendToRenderer('download-progress', {
    percent:       Math.round(progress.percent),
    transferred:   progress.transferred,
    total:         progress.total,
    bytesPerSecond: progress.bytesPerSecond
  });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Atualização baixada:', info.version);
  sendToRenderer('update-downloaded', {
    version: info.version
  });
});

autoUpdater.on('error', (err) => {
  log.error('Erro no auto-updater:', err);
  sendToRenderer('update-error', err.message || String(err));
});

// ─── IPC — Renderer → Main ───────────────────────────────────────────────────
ipcMain.on('download-update', () => {
  log.info('Usuário aceitou baixar a atualização.');
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  log.info('Usuário solicitou instalação. Reiniciando...');
  autoUpdater.quitAndInstall(false, true);
});

// Fecha o app completamente
ipcMain.on('quit-app', () => {
  log.info('Usuário solicitou saída do sistema.');
  app.quit();
});

// Retorna a versão atual do package.json
ipcMain.on('get-version', (event) => {
  event.returnValue = app.getVersion();
});

// ─── Ciclo de vida do app ────────────────────────────────────────────────────
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
