/**
 * Server manager for DSH Desktop.
 * Launches, monitors, and stops the DeepSeek Harness web backend.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, createWriteStream, type WriteStream } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
import { app } from 'electron'

/** Regular expression to extract the authenticated token URL printed by `dsh web`. */
export const DSH_WEB_URL_REGEX = /dsh web:\s*(https?:\/\/[^\s]+)/i

export type ServerState = 'idle' | 'starting' | 'running' | 'error' | 'stopped'

export interface ServerStatus {
  state: ServerState
  message?: string
  url?: string
}

export class ServerManager {
  private child: ChildProcess | null = null
  private state: ServerState = 'idle'
  private authenticatedUrl: string | null = null
  private logStream: WriteStream | null = null
  private statusListeners = new Set<(status: ServerStatus) => void>()
  private logFilePath: string

  constructor() {
    const logDir = join(app.getPath('userData'), 'logs')
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }
    this.logFilePath = join(logDir, 'server.log')
  }

  getLogFilePath(): string {
    return this.logFilePath
  }

  getStatus(): ServerStatus {
    return {
      state: this.state,
      url: this.authenticatedUrl ?? undefined,
    }
  }

  onStatus(listener: (status: ServerStatus) => void): () => void {
    this.statusListeners.add(listener)
    listener(this.getStatus())
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  private notify(status: ServerStatus): void {
    this.state = status.state
    if (status.url !== undefined) this.authenticatedUrl = status.url
    for (const listener of this.statusListeners) {
      listener(status)
    }
  }

  /**
   * Find the DSH executable or launcher script across packaged and development locations.
   */
  resolveBackendEntry(): { command: string; args: string[]; env: NodeJS.ProcessEnv } {
    // 1. Explicit override via DSH_BIN_PATH
    if (process.env.DSH_BIN_PATH && existsSync(process.env.DSH_BIN_PATH)) {
      const bin = process.env.DSH_BIN_PATH
      if (bin.endsWith('.js') || bin.endsWith('.ts')) {
        return {
          command: process.execPath,
          args: [bin],
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        }
      }
      return { command: bin, args: [], env: { ...process.env } }
    }

    // 2. Packaged standalone binary in resources (e.g. resources/bin/dsh.exe)
    const resources = process.resourcesPath || join(app.getAppPath(), 'resources')
    const packagedExe = join(
      resources,
      'bin',
      process.platform === 'win32' ? 'dsh.exe' : 'dsh',
    )
    if (existsSync(packagedExe)) {
      return { command: packagedExe, args: [], env: { ...process.env } }
    }

    // 3. Packaged CLI entry point in resources/app or app.getAppPath()
    const candidateCliPaths = [
      join(app.getAppPath(), 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
      join(resources, 'app/node_modules/@deepseek-ai/dsh/lib/bin.js'),
      join(resources, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    ]
    let packagedCli: string | null = null
    for (const p of candidateCliPaths) {
      if (existsSync(p)) {
        packagedCli = p
        break
      }
    }

    // Bundled Node runtime binary (e.g. resources/bin/node.exe)
    const bundledNode = join(
      resources,
      'bin',
      process.platform === 'win32' ? 'node.exe' : 'node',
    )

    if (packagedCli) {
      if (existsSync(bundledNode)) {
        return {
          command: bundledNode,
          args: [packagedCli],
          env: { ...process.env },
        }
      }
      return {
        command: process.execPath,
        args: [packagedCli],
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      }
    }

    // 4. Search up the directory tree for monorepo development checkout
    let dir = app.getAppPath()
    for (let i = 0; i < 6; i++) {
      const builtBin = resolve(dir, 'apps/cli/lib/bin.js')
      if (existsSync(builtBin)) {
        return {
          command: process.execPath,
          args: [builtBin],
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        }
      }

      const sourceBin = resolve(dir, 'apps/cli/src/bin.ts')
      if (existsSync(sourceBin)) {
        // Source execution via tsx if available or node with tsx
        return {
          command: 'node',
          args: ['--import', 'tsx/esm', sourceBin],
          env: { ...process.env },
        }
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }

    // 5. Fallback: bundled node if present, otherwise system dsh
    if (existsSync(bundledNode)) {
      return {
        command: bundledNode,
        args: [],
        env: { ...process.env },
      }
    }

    return {
      command: process.platform === 'win32' ? 'dsh.cmd' : 'dsh',
      args: [],
      env: { ...process.env },
    }
  }

  /**
   * Start the DSH web backend and resolve once the authenticated URL is printed.
   */
  async start(): Promise<string> {
    // Check if an external server URL was provided
    if (process.env.DSH_DESKTOP_SERVER_URL) {
      const url = process.env.DSH_DESKTOP_SERVER_URL
      this.notify({ state: 'running', url, message: 'Connected to external server URL' })
      return url
    }

    if (this.child && !this.child.killed) {
      if (this.authenticatedUrl) return this.authenticatedUrl
    }

    this.notify({ state: 'starting', message: 'Locating and launching harness backend...' })

    try {
      this.logStream = createWriteStream(this.logFilePath, { flags: 'a' })
    } catch {
      // Ignored if unable to open log file
    }

    const { command, args: initialArgs, env } = this.resolveBackendEntry()
    const spawnArgs = [...initialArgs, 'web', '--no-open', '--port', '0']

    this.log(`[Desktop] Spawning: ${command} ${spawnArgs.join(' ')}\n`)

    return new Promise<string>((resolveUrl, reject) => {
      let resolved = false
      let stderrBuffer = ''

      try {
        const workspaceCwd = process.env.DSH_WORKSPACE || homedir()
        const child = spawn(command, spawnArgs, {
          cwd: workspaceCwd,
          env: {
            ...env,
            // Ensure CI telemetry disabled flag is respected if set
            DSH_TELEMETRY_DISABLED: process.env.DSH_TELEMETRY_DISABLED ?? '0',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        })

        this.child = child

        child.stdout?.on('data', (chunk: Buffer | string) => {
          const text = chunk.toString('utf8')
          this.log(`[STDOUT] ${text}`)

          if (!resolved) {
            const match = DSH_WEB_URL_REGEX.exec(text)
            if (match?.[1]) {
              resolved = true
              const url = match[1]
              this.authenticatedUrl = url
              this.notify({ state: 'running', url, message: 'Backend online' })
              resolveUrl(url)
            }
          }
        })

        child.stderr?.on('data', (chunk: Buffer | string) => {
          const text = chunk.toString('utf8')
          stderrBuffer += text
          this.log(`[STDERR] ${text}`)
        })

        child.on('error', (err: Error) => {
          this.log(`[ERROR] Process failed to spawn: ${err.message}\n`)
          this.notify({ state: 'error', message: err.message })
          if (!resolved) {
            resolved = true
            reject(new Error(`Failed to start DeepSeek Harness backend: ${err.message}`))
          }
        })

        child.on('exit', (code: number | null, signal: string | null) => {
          this.log(`[EXIT] Process exited with code ${String(code)} and signal ${String(signal)}\n`)
          this.child = null
          if (!resolved) {
            resolved = true
            const reason = stderrBuffer.trim() || `Exited prematurely with code ${String(code)}`
            this.notify({ state: 'error', message: reason })
            reject(new Error(reason))
          } else {
            this.notify({ state: 'stopped', message: `Server stopped (code: ${String(code)})` })
          }
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.notify({ state: 'error', message })
        reject(err)
      }
    })
  }

  private log(message: string): void {
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.write(`[${new Date().toISOString()}] ${message}`)
    }
  }

  /**
   * Gracefully stop the backend server.
   */
  async stop(): Promise<void> {
    if (!this.child || this.child.killed) {
      this.notify({ state: 'stopped' })
      return
    }

    const child = this.child
    this.child = null

    return new Promise<void>((resolveStop) => {
      const pid = child.pid

      const forceKillTimer = setTimeout(() => {
        try {
          if (process.platform === 'win32' && pid) {
            spawn('taskkill', ['/pid', pid.toString(), '/T', '/F'], { windowsHide: true })
          } else {
            child.kill('SIGKILL')
          }
        } catch {
          // Process might already be gone
        }
        this.notify({ state: 'stopped' })
        resolveStop()
      }, 4000)

      child.once('exit', () => {
        clearTimeout(forceKillTimer)
        this.notify({ state: 'stopped' })
        resolveStop()
      })

      try {
        child.kill('SIGTERM')
      } catch {
        // If SIGTERM fails, trigger fallback immediately
        clearTimeout(forceKillTimer)
        resolveStop()
      }
    })
  }
}
