/**
 * Server manager for moreweb Desktop.
 * Launches, monitors, and stops the moreweb harness web backend.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, createWriteStream, type WriteStream } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
import { app } from 'electron'

/** Regular expression to extract the authenticated token URL printed by `dsh web`. */
export const DSH_WEB_URL_REGEX = /dsh web:\s*(https?:\/\/[^\s]+)/i

/** Default boot budget before the manager gives up with the collected stderr
 * tail; DSH_DESKTOP_START_TIMEOUT_MS overrides it per boot. */
export const DEFAULT_START_TIMEOUT_MS = 90_000

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
  private startPromise: Promise<string> | null = null

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

  /** A log exists only once a backend child has been spawned (external-server mode never writes one). */
  hasLogFile(): boolean {
    return existsSync(this.logFilePath)
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
          command: 'node',
          args: [bin],
          env: { ...process.env },
        }
      }
      return { command: bin, args: [], env: { ...process.env } }
    }

    // 2. In development (unpackaged), prioritize monorepo checkout
    if (!app.isPackaged) {
      let dir = app.getAppPath()
      for (let i = 0; i < 6; i++) {
        const builtBin = resolve(dir, 'apps/cli/lib/bin.js')
        if (existsSync(builtBin)) {
          return {
            command: 'node',
            args: [builtBin],
            env: { ...process.env },
          }
        }

        const sourceBin = resolve(dir, 'apps/cli/src/bin.ts')
        if (existsSync(sourceBin)) {
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
    }

    // 3. Packaged standalone binary in resources (e.g. resources/bin/dsh.exe)
    const resources = process.resourcesPath || join(app.getAppPath(), 'resources')
    const packagedExe = join(
      resources,
      'bin',
      process.platform === 'win32' ? 'dsh.exe' : 'dsh',
    )
    if (existsSync(packagedExe)) {
      return { command: packagedExe, args: [], env: { ...process.env } }
    }

    // Bundled Node runtime binary (e.g. resources/bin/node.exe or app/build/bin/node.exe)
    const candidateBundledNodes = [
      join(resources, 'bin', process.platform === 'win32' ? 'node.exe' : 'node'),
      join(app.getAppPath(), 'build', 'bin', process.platform === 'win32' ? 'node.exe' : 'node'),
    ]
    let bundledNode: string | null = null
    for (const b of candidateBundledNodes) {
      if (existsSync(b)) {
        bundledNode = b
        break
      }
    }

    // 4. Packaged CLI entry point in resources/app or app.getAppPath()
    const candidateCliPaths = [
      join(resources, 'app/node_modules/@deepseek-ai/dsh/lib/bin.js'),
      join(resources, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
      join(app.getAppPath(), 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    ]
    let packagedCli: string | null = null
    for (const p of candidateCliPaths) {
      if (existsSync(p)) {
        packagedCli = p
        break
      }
    }

    if (packagedCli) {
      if (bundledNode) {
        return {
          command: bundledNode,
          args: [packagedCli],
          env: { ...process.env },
        }
      }
      // DSH requires Node >= 22 (Cordis internal module loader requires Node 22+).
      // Electron 34 bundles Node 20, so ELECTRON_RUN_AS_NODE cannot run DSH.
      const electronNodeMajor = parseInt(process.versions.node.split('.')[0] || '0', 10)
      if (electronNodeMajor >= 22) {
        return {
          command: process.execPath,
          args: [packagedCli],
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        }
      }
      return {
        command: 'node',
        args: [packagedCli],
        env: { ...process.env },
      }
    }

    // 5. Fallback: Search up the directory tree for monorepo development checkout
    let dir = app.getAppPath()
    for (let i = 0; i < 6; i++) {
      const builtBin = resolve(dir, 'apps/cli/lib/bin.js')
      if (existsSync(builtBin)) {
        return {
          command: 'node',
          args: [builtBin],
          env: { ...process.env },
        }
      }

      const sourceBin = resolve(dir, 'apps/cli/src/bin.ts')
      if (existsSync(sourceBin)) {
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

    // 6. Fallback: bundled node if present, otherwise system dsh
    if (bundledNode) {
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
   * A concurrent call while a boot is in flight joins that boot instead of
   * spawning a second backend.
   */
  async start(): Promise<string> {
    // Check if an external server URL was provided
    if (process.env.DSH_DESKTOP_SERVER_URL) {
      const url = process.env.DSH_DESKTOP_SERVER_URL
      const scheme = (() => { try { return new URL(url).protocol } catch { return null } })()
      if (scheme !== 'http:' && scheme !== 'https:') {
        const message = `DSH_DESKTOP_SERVER_URL must be an http(s) URL, got: ${url}`
        this.notify({ state: 'error', message })
        throw new Error(message)
      }
      this.notify({ state: 'running', url, message: 'Connected to external server URL' })
      return url
    }

    if (this.child && !this.child.killed) {
      if (this.authenticatedUrl) return this.authenticatedUrl
    }
    if (this.startPromise) return this.startPromise

    this.notify({ state: 'starting', message: 'Locating and launching harness backend...' })

    try {
      this.logStream = createWriteStream(this.logFilePath, { flags: 'a' })
    } catch {
      // Ignored if unable to open log file
    }

    const { command, args: initialArgs, env } = this.resolveBackendEntry()
    const spawnArgs = [...initialArgs, 'web', '--no-open', '--port', '0']

    this.log(`[Desktop] Spawning: ${command} ${spawnArgs.join(' ')}\n`)

    const boot = new Promise<string>((resolveUrl, reject) => {
      let resolved = false
      let stderrBuffer = ''

      const fail = (reason: string): void => {
        if (resolved) return
        resolved = true
        this.notify({ state: 'error', message: reason })
        reject(new Error(reason))
      }

      try {
        const workspaceCwd = process.env.DSH_WORKSPACE || homedir()
        const child = spawn(command, spawnArgs, {
          cwd: workspaceCwd,
          env: {
            ...env,
            // Telemetry stays off unless the user opts in.
            DSH_TELEMETRY_DISABLED: process.env.DSH_TELEMETRY_DISABLED ?? '1',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        })

        this.child = child

        const timeoutMs = Number(process.env.DSH_DESKTOP_START_TIMEOUT_MS) || DEFAULT_START_TIMEOUT_MS
        const timeout = setTimeout(() => {
          const tail = stderrBuffer.trim().slice(-2000)
          this.log(`[TIMEOUT] Backend did not print its URL within ${timeoutMs}ms\n`)
          fail(`Backend did not start within ${Math.round(timeoutMs / 1000)}s${tail === '' ? '' : `: ${tail}`}`)
          // Tear the hung boot down so the next start() is not blocked by a
          // half-alive child that never printed its URL.
          void this.stop()
        }, timeoutMs)

        child.stdout.on('data', (chunk: Buffer | string) => {
          const text = chunk.toString('utf8')
          this.log(`[STDOUT] ${text}`)

          if (!resolved) {
            const match = DSH_WEB_URL_REGEX.exec(text)
            if (match?.[1]) {
              resolved = true
              clearTimeout(timeout)
              const url = match[1]
              this.authenticatedUrl = url
              this.notify({ state: 'running', url, message: 'Backend online' })
              resolveUrl(url)
            }
          }
        })

        child.stderr.on('data', (chunk: Buffer | string) => {
          const text = chunk.toString('utf8')
          stderrBuffer += text
          this.log(`[STDERR] ${text}`)
        })

        child.on('error', (err: Error) => {
          this.log(`[ERROR] Process failed to spawn: ${err.message}\n`)
          clearTimeout(timeout)
          fail(`Failed to start moreweb harness backend: ${err.message}`)
        })

        child.on('exit', (code: number | null, signal: string | null) => {
          this.log(`[EXIT] Process exited with code ${String(code)} and signal ${String(signal)}\n`)
          this.child = null
          if (!resolved) {
            clearTimeout(timeout)
            const reason = stderrBuffer.trim() || `Exited prematurely with code ${String(code)}`
            fail(reason)
          } else {
            this.notify({ state: 'stopped', message: `Server stopped (code: ${String(code)})` })
          }
        })
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        this.notify({ state: 'error', message: errorObj.message })
        reject(errorObj)
      }
    })

    this.startPromise = boot
    try {
      return await boot
    } finally {
      this.startPromise = null
    }
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
