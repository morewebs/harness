/**
 * Electron Main Process for MoreWeb Desktop.
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

  // Show loading screen
  await mainWindow.loadFile(getLoadingHtmlPath())

  try {
    const url = await serverManager.start()
    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(url)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (mainWindow && !mainWindow.isDestroyed()) {
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
    title: 'DSH Desktop',
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

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
}

// App lifecycle
app.whenReady().then(async () => {
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
