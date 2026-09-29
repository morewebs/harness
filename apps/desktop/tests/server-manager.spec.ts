import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { join } from 'node:path'
import { DSH_WEB_URL_REGEX, ServerManager } from '../src/main/server-manager.ts'

const mockExistingPaths = new Set<string>()

/** Minimal fake ChildProcess handed back by the mocked spawn. */
class FakeChild extends EventEmitter {
  readonly pid = 4242
  killed = false
  readonly stdout = new EventEmitter()
  readonly stderr = new EventEmitter()
  kill(): boolean {
    this.killed = true
    this.emit('exit', null, 'SIGTERM')
    return true
  }
}

/** Fake child the mocked spawn returns while set; cleared per test. */
let fakeChild: FakeChild | null = null
/** Spawn environments captured by the mocked spawn. */
const spawnEnvCalls: NodeJS.ProcessEnv[] = []

// Mock electron app; the userData path lives in the OS temp dir so spawned
// boots never write logs into the repository tree.
vi.mock('electron', async () => {
  const { mkdtempSync } = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const userData = mkdtempSync(path.join(os.tmpdir(), 'dsh-desktop-spec-'))
  return {
    app: {
      isPackaged: true,
      getPath: () => userData,
      getAppPath: () => process.cwd(),
    },
  }
})

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: (path: string) =>
      mockExistingPaths.has(path) ||
      (typeof path === 'string' && path.includes('custom\\dsh.exe')) ||
      actual.existsSync(path),
  }
})

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    spawn: (...args: Parameters<typeof actual.spawn>) => {
      spawnEnvCalls.push(args[2]?.env ?? {})
      if (fakeChild !== null) return fakeChild
      return actual.spawn(...args)
    },
  }
})

describe('ServerManager & URL Extraction', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    mockExistingPaths.clear()
  })

  afterEach(() => {
    process.env = originalEnv
    mockExistingPaths.clear()
    vi.restoreAllMocks()
  })

  it('matches standard loopback tokenized URL', () => {
    const output = 'dsh web: http://127.0.0.1:54321/?token=abc-123-def\n'
    const match = DSH_WEB_URL_REGEX.exec(output)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe('http://127.0.0.1:54321/?token=abc-123-def')
  })

  it('matches tokenized URL when followed by LAN address', () => {
    const output = 'dsh web: http://127.0.0.1:8080/?token=secure_tok (LAN: http://192.168.1.5:8080/?token=secure_tok)\n'
    const match = DSH_WEB_URL_REGEX.exec(output)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe('http://127.0.0.1:8080/?token=secure_tok')
  })

  it('does not match unrelated lines', () => {
    const output = 'dsh: loading plugins...\n'
    const match = DSH_WEB_URL_REGEX.exec(output)
    expect(match).toBeNull()
  })

  it('initializes in idle state', () => {
    const manager = new ServerManager()
    expect(manager.getStatus()).toEqual({
      state: 'idle',
      url: undefined,
    })
  })

  it('connects to external server directly if DSH_DESKTOP_SERVER_URL is set', async () => {
    process.env.DSH_DESKTOP_SERVER_URL = 'http://127.0.0.1:9090'
    const manager = new ServerManager()

    const url = await manager.start()
    expect(url).toBe('http://127.0.0.1:9090')
    expect(manager.getStatus()).toEqual({
      state: 'running',
      url: 'http://127.0.0.1:9090',
    })
  })

  it('honors DSH_BIN_PATH override', () => {
    process.env.DSH_BIN_PATH = 'C:\\custom\\dsh.exe'
    const manager = new ServerManager()
    const entry = manager.resolveBackendEntry()
    expect(entry.command).toBe('C:\\custom\\dsh.exe')
  })

  it('resolves bundled node and packaged cli when both are present', () => {
    ;(process as { resourcesPath?: string }).resourcesPath = 'C:\\mock-resources'
    const packagedCli = join(process.cwd(), 'node_modules/@deepseek-ai/dsh/lib/bin.js')
    const bundledNode = join(
      'C:\\mock-resources',
      'bin',
      process.platform === 'win32' ? 'node.exe' : 'node',
    )
    mockExistingPaths.add(packagedCli)
    mockExistingPaths.add(bundledNode)

    const manager = new ServerManager()
    const entry = manager.resolveBackendEntry()
    expect(entry.command).toBe(bundledNode)
    expect(entry.args).toEqual([packagedCli])
  })

  it('resolves electron run as node when packaged cli is present without bundled node', () => {
    const packagedCli = join(process.cwd(), 'node_modules/@deepseek-ai/dsh/lib/bin.js')
    mockExistingPaths.add(packagedCli)

    const manager = new ServerManager()
    const entry = manager.resolveBackendEntry()
    expect(entry.command).toBe(process.execPath)
    expect(entry.args).toEqual([packagedCli])
    expect(entry.env.ELECTRON_RUN_AS_NODE).toBe('1')
  })

  it('rejects a non-http external server URL instead of loading it', async () => {
    process.env.DSH_DESKTOP_SERVER_URL = 'file:///etc/passwd'
    const manager = new ServerManager()

    await expect(manager.start()).rejects.toThrow(/http\(s\) URL/)
    expect(manager.getStatus().state).toBe('error')
  })

  it('spawns with telemetry disabled by default and fails loudly on boot timeout', async () => {
    process.env.DSH_DESKTOP_START_TIMEOUT_MS = '30'
    delete process.env.DSH_TELEMETRY_DISABLED
    process.env.DSH_BIN_PATH = 'C:\\custom\\dsh.exe'
    const child = new FakeChild()
    fakeChild = child
    spawnEnvCalls.length = 0

    const manager = new ServerManager()
    await expect(manager.start()).rejects.toThrow(/did not start within/)

    expect(spawnEnvCalls).toHaveLength(1)
    expect(spawnEnvCalls[0]).toMatchObject({ DSH_TELEMETRY_DISABLED: '1' })
    // The timed-out boot is torn down, not left half-alive.
    expect(child.killed).toBe(true)
  })

  it('joins an in-flight boot instead of spawning a second backend', async () => {
    process.env.DSH_DESKTOP_START_TIMEOUT_MS = '30'
    process.env.DSH_BIN_PATH = 'C:\\custom\\dsh.exe'
    fakeChild = new FakeChild()
    spawnEnvCalls.length = 0

    const manager = new ServerManager()
    const boots = [manager.start(), manager.start()]
    await expect(Promise.all(boots)).rejects.toThrow(/did not start within/)
    expect(spawnEnvCalls).toHaveLength(1)
  })
})
