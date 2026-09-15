/**
 * CommonJS Preload script for moreweb Desktop.
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
  minimize: () => ipcRenderer.invoke('dsh:window-minimize'),
  maximize: () => ipcRenderer.invoke('dsh:window-maximize'),
  close: () => ipcRenderer.invoke('dsh:window-close'),
  isMaximized: () => ipcRenderer.invoke('dsh:window-is-maximized'),
  canGoBack: () => ipcRenderer.invoke('dsh:can-go-back'),
  canGoForward: () => ipcRenderer.invoke('dsh:can-go-forward'),
  goBack: () => ipcRenderer.invoke('dsh:go-back'),
  goForward: () => ipcRenderer.invoke('dsh:go-forward'),
  popupMenu: (menuName, x, y) => ipcRenderer.invoke('dsh:popup-menu', { menuName, x, y }),
  onMaximizedChange: (callback) => {
    const subscription = (_event, isMaximized) => {
      callback(isMaximized)
    }
    ipcRenderer.on('dsh:window-maximized-change', subscription)
    return () => {
      ipcRenderer.removeListener('dsh:window-maximized-change', subscription)
    }
  },
  onNavStateChange: (callback) => {
    const subscription = (_event, state) => {
      callback(state)
    }
    ipcRenderer.on('dsh:nav-state-change', subscription)
    return () => {
      ipcRenderer.removeListener('dsh:nav-state-change', subscription)
    }
  },
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
