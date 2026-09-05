/**
 * Electron Preload script for DSH Desktop.
 * Exposes safe desktop-specific primitives to the window.
 */

import { contextBridge, ipcRenderer } from 'electron'

export interface DesktopBridge {
  isDesktop: true
  platform: NodeJS.Platform
  restartServer: () => Promise<void>
  openHomeFolder: () => Promise<void>
  openLogFolder: () => Promise<void>
  openExternal: (url: string) => Promise<void>
  getVersion: () => Promise<string>
  onServerStatus: (callback: (status: { state: string; message?: string }) => void) => () => void
}

const desktopBridge: DesktopBridge = {
  isDesktop: true,
  platform: process.platform,
  restartServer: () => ipcRenderer.invoke('dsh:restart-server'),
  openHomeFolder: () => ipcRenderer.invoke('dsh:open-home-folder'),
  openLogFolder: () => ipcRenderer.invoke('dsh:open-log-folder'),
  openExternal: (url: string) => ipcRenderer.invoke('dsh:open-external', url),
  getVersion: () => ipcRenderer.invoke('dsh:get-version'),
  onServerStatus: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, status: { state: string; message?: string }): void => {
      callback(status)
    }
    ipcRenderer.on('dsh:server-status', subscription)
    return () => {
      ipcRenderer.removeListener('dsh:server-status', subscription)
    }
  },
}

contextBridge.exposeInMainWorld('desktopAPI', desktopBridge)
