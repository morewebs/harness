/**
 * Electron Main Process for moreweb Desktop.
 */

import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { ServerManager } from './server-manager.js'
import { buildApplicationMenu } from './menu.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Delay before navigating to the backend URL, so the splash blur-out in loading.css can play. */
const SPLASH_EXIT_MS = 400

let mainWindow: BrowserWindow | null = null
let serverManager: ServerManager | null = null

function getLoadingHtmlPath(): string {
  const candidates = [
    join(__dirname, '../renderer/loading.html'),
    join(__dirname, '../../src/renderer/loading.html'),
    join(app.getAppPath(), 'dist/renderer/loading.html'),
    join(app.getAppPath(), 'src/renderer/loading.html'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return join(__dirname, '../renderer/loading.html')
}

function getPreloadScriptPath(): string {
  const candidates = [
    join(__dirname, '../preload/index.cjs'),
    join(__dirname, '../../src/preload/index.cjs'),
    join(app.getAppPath(), 'dist/preload/index.cjs'),
    join(app.getAppPath(), 'src/preload/index.cjs'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return join(__dirname, '../preload/index.cjs')
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

async function startBackendAndLoad(): Promise<void> {
  if (!mainWindow || !serverManager) return

  // Show splash / loading screen
  await mainWindow.loadFile(getLoadingHtmlPath())

  try {
    const url = await serverManager.start()
    if (!mainWindow.isDestroyed()) {
      // Let the splash exit animation play before the window navigates away.
      await new Promise<void>(resolve => setTimeout(resolve, SPLASH_EXIT_MS))
      if (!mainWindow.isDestroyed()) {
        await mainWindow.loadURL(url)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dsh:server-status', {
        state: 'error',
        message,
      })
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'moreweb Desktop',
    show: false,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadScriptPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  // Notify renderer when maximize / restore state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('dsh:window-maximized-change', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('dsh:window-maximized-change', false)
  })

  // Notify renderer on navigation state changes for back/forward buttons
  const sendNavState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dsh:nav-state-change', {
        canGoBack: mainWindow.webContents.canGoBack(),
        canGoForward: mainWindow.webContents.canGoForward(),
      })
    }
  }
  mainWindow.webContents.on('did-navigate', sendNavState)
  mainWindow.webContents.on('did-navigate-in-page', sendNavState)

  // Smooth appearance once ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Prevent navigation to external sites inside the app window; open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      // Check if it's an external URL (not our local server)
      const currentUrl = mainWindow?.webContents.getURL() ?? ''
      try {
        const targetOrigin = new URL(url).origin
        const currentOrigin = currentUrl ? new URL(currentUrl).origin : ''
        if (targetOrigin !== currentOrigin) {
          void shell.openExternal(url)
          return { action: 'deny' }
        }
      } catch {
        void shell.openExternal(url)
        return { action: 'deny' }
      }
    }
    return { action: 'allow' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function setupIpc(): void {
  ipcMain.handle('dsh:restart-server', async () => {
    if (serverManager) {
      await serverManager.stop()
      await startBackendAndLoad()
    }
  })

  ipcMain.handle('dsh:open-home-folder', () => {
    const home = process.env.DSH_HOME || join(homedir(), '.dsh')
    return shell.openPath(home)
  })

  ipcMain.handle('dsh:open-log-folder', () => {
    if (serverManager) {
      shell.showItemInFolder(serverManager.getLogFilePath())
    }
  })

  ipcMain.handle('dsh:open-external', (_event, url: string) => {
    return shell.openExternal(url)
  })

  ipcMain.handle('dsh:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('dsh:window-minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('dsh:window-maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    } else {
      mainWindow.maximize()
      return true
    }
  })

  ipcMain.handle('dsh:window-close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('dsh:window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false
  })

  ipcMain.handle('dsh:can-go-back', () => {
    return mainWindow?.webContents.canGoBack() ?? false
  })

  ipcMain.handle('dsh:can-go-forward', () => {
    return mainWindow?.webContents.canGoForward() ?? false
  })

  ipcMain.handle('dsh:go-back', () => {
    if (mainWindow?.webContents.canGoBack()) {
      mainWindow.webContents.goBack()
    }
  })

  ipcMain.handle('dsh:go-forward', () => {
    if (mainWindow?.webContents.canGoForward()) {
      mainWindow.webContents.goForward()
    }
  })

  ipcMain.handle('dsh:popup-menu', (_event, { menuName, x, y }: { menuName: string; x?: number; y?: number }) => {
    if (!mainWindow || !serverManager) return
    const menu = buildApplicationMenu(serverManager, () => {
      void (async () => {
        if (serverManager) {
          await serverManager.stop()
          await startBackendAndLoad()
        }
      })()
    })
    const cleanName = menuName.toLowerCase()
    const item = menu.items.find((i) => {
      const label = (i.label ?? (i.role ? i.role : '')).replace(/&/g, '').toLowerCase()
      return label === cleanName
    })
    if (item?.submenu) {
      item.submenu.popup({
        window: mainWindow,
        x: typeof x === 'number' ? Math.round(x) : undefined,
        y: typeof y === 'number' ? Math.round(y) : undefined,
      })
    }
  })
}

// App lifecycle
void app.whenReady().then(async () => {
  serverManager = new ServerManager()

  serverManager.onStatus((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dsh:server-status', status)
    }
  })

  const menu = buildApplicationMenu(serverManager, () => {
    void (async () => {
      if (serverManager) {
        await serverManager.stop()
        await startBackendAndLoad()
      }
    })()
  })
  Menu.setApplicationMenu(menu)

  setupIpc()
  createWindow()
  await startBackendAndLoad()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      void startBackendAndLoad()
    }
  })
})

let isQuitting = false

app.on('before-quit', (e) => {
  if (!isQuitting && serverManager) {
    e.preventDefault()
    isQuitting = true
    void serverManager.stop().finally(() => {
      app.quit()
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
