// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DocumentTitle } from '../src/client/DocumentTitle.tsx'

afterEach(() => {
  cleanup()
  document.title = ''
  vi.unstubAllEnvs()
})

describe('DocumentTitle', () => {
  it('projects a durable title and restores the product title', () => {
    vi.stubEnv('DSH_CLIENT_TITLE', 'moreweb harness')
    document.title = 'stale title'
    const mounted = render(<DocumentTitle productTitle="moreweb harness" />)
    expect(document.title).toBe('moreweb harness')
    mounted.rerender(<DocumentTitle title="First title" productTitle="moreweb harness" />)
    expect(document.title).toBe('First title — moreweb harness')
    mounted.rerender(<DocumentTitle title="Revised title" productTitle="moreweb harness" />)
    expect(document.title).toBe('Revised title — moreweb harness')
    mounted.rerender(<DocumentTitle productTitle="moreweb harness" />)
    expect(document.title).toBe('moreweb harness')
    mounted.unmount()
    expect(document.title).toBe('moreweb harness')
  })

  it('uses the generic title when the build provides no title', () => {
    vi.stubEnv('DSH_CLIENT_TITLE', '')
    delete process.env.DSH_CLIENT_TITLE
    const mounted = render(<DocumentTitle title="First title" productTitle="moreweb Local Build" />)
    expect(document.title).toBe('First title — moreweb Local Build')
    mounted.unmount()
    expect(document.title).toBe('moreweb Local Build')
  })
})
