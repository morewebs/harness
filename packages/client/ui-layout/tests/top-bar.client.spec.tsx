// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { TopBar } from '../src/client/TopBar.tsx'
import { en } from '../src/client/locales.ts'

/** English translate stand-in for the registration's locale seat. */
const t = makeTranslate(en)

afterEach(() => {
  cleanup()
  delete (window as { desktopAPI?: unknown }).desktopAPI
})

describe('TopBar', () => {
  it('renders sidebar toggle and fires onToggleSidebar', () => {
    const onToggle = vi.fn()
    const { getByLabelText } = render(<TopBar t={t} onToggleSidebar={onToggle} sidebarCollapsed={false} />)
    const toggleBtn = getByLabelText('Collapse Primary Side Bar')
    expect(toggleBtn).toBeDefined()
    fireEvent.click(toggleBtn)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('reflects sidebarCollapsed state in tooltip and aria-label', () => {
    const onToggle = vi.fn()
    const { getByLabelText } = render(<TopBar t={t} onToggleSidebar={onToggle} sidebarCollapsed={true} />)
    expect(getByLabelText('Open Primary Side Bar')).toBeDefined()
  })

  it('renders navigation buttons disabled until the bridge reports history', async () => {
    window.desktopAPI = {
      isDesktop: true,
      isMaximized: vi.fn().mockResolvedValue(false),
      canGoBack: vi.fn().mockResolvedValue(false),
      canGoForward: vi.fn().mockResolvedValue(false),
      onMaximizedChange: () => () => {},
      onNavStateChange: () => () => {},
    }

    const { getByLabelText } = render(<TopBar t={t} onToggleSidebar={() => {}} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect((getByLabelText('Back') as HTMLButtonElement).disabled).toBe(true)
    expect((getByLabelText('Forward') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders window controls and delegates to desktopAPI in desktop mode', async () => {
    const minimize = vi.fn().mockResolvedValue(undefined)
    const maximize = vi.fn().mockResolvedValue(true)
    const close = vi.fn().mockResolvedValue(undefined)
    const popupMenu = vi.fn().mockResolvedValue(undefined)
    const goBack = vi.fn().mockResolvedValue(undefined)
    const goForward = vi.fn().mockResolvedValue(undefined)

    let maxChangeCb: ((max: boolean) => void) | undefined
    let navChangeCb: ((state: { canGoBack: boolean; canGoForward: boolean }) => void) | undefined

    window.desktopAPI = {
      isDesktop: true,
      platform: 'win32',
      minimize,
      maximize,
      close,
      isMaximized: vi.fn().mockResolvedValue(false),
      canGoBack: vi.fn().mockResolvedValue(true),
      canGoForward: vi.fn().mockResolvedValue(false),
      goBack,
      goForward,
      popupMenu,
      onMaximizedChange: (cb) => { maxChangeCb = cb; return () => {} },
      onNavStateChange: (cb) => { navChangeCb = cb; return () => {} },
    }

    const { getByLabelText, getByText } = render(<TopBar t={t} onToggleSidebar={() => {}} />)
    await act(async () => {
      await Promise.resolve()
    })

    // Window controls
    expect(getByLabelText('Window Controls')).toBeDefined()

    fireEvent.click(getByLabelText('Minimize'))
    expect(minimize).toHaveBeenCalledTimes(1)

    fireEvent.click(getByLabelText('Maximize'))
    expect(maximize).toHaveBeenCalledTimes(1)

    fireEvent.click(getByLabelText('Close'))
    expect(close).toHaveBeenCalledTimes(1)

    // Navigation through desktopAPI
    fireEvent.click(getByLabelText('Back'))
    expect(goBack).toHaveBeenCalledTimes(1)

    // Menu clicks trigger popupMenu
    fireEvent.click(getByText('File'))
    expect(popupMenu).toHaveBeenCalledWith('File', expect.any(Number), expect.any(Number))

    fireEvent.click(getByText('Edit'))
    expect(popupMenu).toHaveBeenCalledWith('Edit', expect.any(Number), expect.any(Number))

    // Maximize state change updates restore icon aria-label
    expect(maxChangeCb).toBeDefined()
    maxChangeCb!(true)

    // Nav state change enables forward button
    expect(navChangeCb).toBeDefined()
    act(() => {
      navChangeCb!({ canGoBack: true, canGoForward: true })
    })
    fireEvent.click(getByLabelText('Forward'))
    expect(goForward).toHaveBeenCalledTimes(1)
  })
})
