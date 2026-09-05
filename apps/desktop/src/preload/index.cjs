/**
 * CommonJS Preload script for DSH Desktop.
 * Must be CommonJS to avoid Node ESM loader protocol restrictions with electron builtin.
 */

const { contextBridge, ipcRenderer } = require('electron')

const desktopBridge = {
  isDesktop: true,
  platform: process.platform,
  restartServer: () => ipcRenderer.invoke('dsh:restart-server'),
  openHomeFolder: () => ipcRenderer.invoke('dsh:open-home-folder'),
  openLogFolder: () => ipcRenderer.invoke('dsh:open-log-folder'),
  openExternal: (url) => ipcRenderer.invoke('dsh:open-external', url),
  getVersion: () => ipcRenderer.invoke('dsh:get-version'),
  onServerStatus: (callback) => {
    const subscription = (_event, status) => {
      callback(status)
    }
    ipcRenderer.on('dsh:server-status', subscription)
    return () => {
      ipcRenderer.removeListener('dsh:server-status', subscription)
    }
  },
}

contextBridge.exposeInMainWorld('desktopAPI', desktopBridge)
