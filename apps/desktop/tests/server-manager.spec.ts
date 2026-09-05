import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { DSH_WEB_URL_REGEX, ServerManager } from '../src/main/server-manager.ts'

const mockExistingPaths = new Set<string>()

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './tmp-test-logs'),
    getAppPath: vi.fn(() => process.cwd()),
  },
}))

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
})
