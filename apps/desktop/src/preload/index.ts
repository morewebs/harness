/**
 * Electron Preload script for moreweb Desktop.
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
  minimize: () => Promise<void>
  maximize: () => Promise<boolean>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  canGoBack: () => Promise<boolean>
  canGoForward: () => Promise<boolean>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  popupMenu: (menuName: string, x?: number, y?: number) => Promise<void>
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
  onNavStateChange: (callback: (state: { canGoBack: boolean; canGoForward: boolean }) => void) => () => void
}

const desktopBridge: DesktopBridge = {
  isDesktop: true,
  platform: process.platform,
  restartServer: () => ipcRenderer.invoke('dsh:restart-server'),
  openHomeFolder: () => ipcRenderer.invoke('dsh:open-home-folder'),
  openLogFolder: () => ipcRenderer.invoke('dsh:open-log-folder'),
  openExternal: (url: string) => ipcRenderer.invoke('dsh:open-external', url),
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
    const subscription = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void => {
      callback(isMaximized)
    }
    ipcRenderer.on('dsh:window-maximized-change', subscription)
    return () => {
      ipcRenderer.removeListener('dsh:window-maximized-change', subscription)
    }
  },
  onNavStateChange: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, state: { canGoBack: boolean; canGoForward: boolean }): void => {
      callback(state)
    }
    ipcRenderer.on('dsh:nav-state-change', subscription)
    return () => {
      ipcRenderer.removeListener('dsh:nav-state-change', subscription)
    }
  },
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
