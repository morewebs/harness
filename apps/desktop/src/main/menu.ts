/**
 * Application menu builder for DSH Desktop.
 */

import { Menu, MenuItemConstructorOptions, app, shell, dialog, BrowserWindow } from 'electron'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ServerManager } from './server-manager.js'

export function buildApplicationMenu(
  serverManager: ServerManager,
  onRestart: () => void,
): Menu {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        },
      ]
      : []),
    {
      label: '&File',
      submenu: [
        {
          label: 'Open Harness &Home (~/.dsh)',
          click: () => {
            const home = process.env.DSH_HOME || join(homedir(), '.dsh')
            void shell.openPath(home)
          },
        },
        {
          label: 'Open &Logs Directory',
          click: () => {
            void shell.showItemInFolder(serverManager.getLogFilePath())
          },
        },
        { type: 'separator' },
        {
          label: '&Restart Server',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: onRestart,
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const, label: 'E&xit' },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: '&View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: '&Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
            { type: 'separator' as const },
            { role: 'front' as const },
            { type: 'separator' as const },
            { role: 'window' as const },
          ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'moreweb harness Documentation',
          click: () => {
            void shell.openExternal('https://github.com/deepseek-ai/deepseek-harness')
          },
        },
        { type: 'separator' as const },
        {
          label: 'About moreweb Desktop',
          click: (menuItem, browserWindow) => {
            const window = browserWindow as BrowserWindow | undefined
            const message = [
              `moreweb Desktop version: ${app.getVersion()}`,
              `Electron: ${process.versions.electron}`,
              `Node.js: ${process.versions.node}`,
              `Chromium: ${process.versions.chrome}`,
              `Platform: ${process.platform} (${process.arch})`,
            ].join('\n')

            if (window) {
              void dialog.showMessageBox(window, {
                type: 'info',
                title: 'About moreweb Desktop',
                message: 'moreweb Desktop',
                detail: message,
                buttons: ['OK'],
              })
            }
          },
        },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}
