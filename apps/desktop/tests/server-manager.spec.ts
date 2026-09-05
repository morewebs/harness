import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DSH_WEB_URL_REGEX, ServerManager } from '../src/main/server-manager.ts'

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
      (typeof path === 'string' && path.includes('custom\\dsh.exe')) || actual.existsSync(path),
  }
})

describe('ServerManager & URL Extraction', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
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
})
