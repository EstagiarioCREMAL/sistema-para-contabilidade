const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronUpdater', {
  // Escuta eventos enviados do main process para o renderer
  onUpdateAvailable:    (cb) => ipcRenderer.on('update-available',    (_e, info)     => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', (_e, info)    => cb(info)),
  onDownloadProgress:   (cb) => ipcRenderer.on('download-progress',   (_e, progress) => cb(progress)),
  onUpdateDownloaded:   (cb) => ipcRenderer.on('update-downloaded',   (_e, info)     => cb(info)),
  onUpdateError:        (cb) => ipcRenderer.on('update-error',        (_e, err)      => cb(err)),

  // Ações enviadas do renderer para o main process
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate:  () => ipcRenderer.send('install-update'),

  // Remove listeners ao desmontar o componente
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
