/**
 * TopBar: Frameless modern native desktop window title bar.
 * Structured as a single-row flex container with space between left and right:
 * - Far left: compact icon and navigation cluster (sidebar toggle icon, left-arrow,
 *   right-arrow) followed immediately by standard menu items ("File", "Edit", "View", "Help")
 *   with ~16px horizontal spacing and subtle light-gray hover states.
 * - Center: drag region.
 * - Far right: standard native-style window control buttons for Minimize, Maximize, and Close.
 */
import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { en as layoutEn, type LayoutKey } from './locales.ts'
import css from './TopBar.module.css'

const t = (key: LayoutKey): string => layoutEn[key]

export interface DesktopBridge {
  isDesktop?: boolean
  platform?: string
  minimize?: () => Promise<void>
  maximize?: () => Promise<boolean>
  close?: () => Promise<void>
  isMaximized?: () => Promise<boolean>
  canGoBack?: () => Promise<boolean>
  canGoForward?: () => Promise<boolean>
  goBack?: () => Promise<void>
  goForward?: () => Promise<void>
  popupMenu?: (name: string, x?: number, y?: number) => Promise<void>
  onMaximizedChange?: (callback: (maximized: boolean) => void) => () => void
  onNavStateChange?: (callback: (state: { canGoBack: boolean; canGoForward: boolean }) => void) => () => void
}

declare global {
  interface Window {
    desktopAPI?: DesktopBridge
  }
}

/** Props for the TopBar component. */
export interface TopBarProps {
  /** Callback fired when the sidebar toggle icon button is clicked. */
  onToggleSidebar: () => void
  /** Current collapsed state of the primary sidebar. */
  sidebarCollapsed?: boolean
}

/** Sidebar toggle icon: rounded rectangle split vertically. */
function IconSidebarSplit({ className }: { className?: string | undefined }): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5.5" y1="2.5" x2="5.5" y2="13.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

/** Navigation left-arrow icon. */
function IconArrowLeft({ className }: { className?: string | undefined }): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M10 3.5L5.5 8L10 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Navigation right-arrow icon. */
function IconArrowRight({ className }: { className?: string | undefined }): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface MenuItemDef {
  key: LayoutKey
  name: string
}

const MENU_ITEMS: readonly MenuItemDef[] = [
  { key: 'topbar.menuFile', name: 'File' },
  { key: 'topbar.menuEdit', name: 'Edit' },
  { key: 'topbar.menuView', name: 'View' },
  { key: 'topbar.menuHelp', name: 'Help' },
]

/**
 * Modern frameless top bar component.
 * @param props - Component props containing sidebar state and toggle handler.
 * @returns Top bar element tree.
 */
export function TopBar({ onToggleSidebar, sidebarCollapsed = false }: TopBarProps): ReactNode {
  const [isMaximized, setIsMaximized] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const isDesktop = typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop)

  useEffect(() => {
    if (!isDesktop || !window.desktopAPI) return

    // Query initial maximized state
    void window.desktopAPI.isMaximized?.().then((max) => {
      setIsMaximized(Boolean(max))
    })

    // Listen to maximize / restore changes
    const offMax = window.desktopAPI.onMaximizedChange?.((max) => {
      setIsMaximized(max)
    })

    // Query initial navigation state
    void window.desktopAPI.canGoBack?.().then((back) => {
      setCanGoBack(Boolean(back))
    })
    void window.desktopAPI.canGoForward?.().then((fwd) => {
      setCanGoForward(Boolean(fwd))
    })

    // Listen to navigation state changes
    const offNav = window.desktopAPI.onNavStateChange?.((state) => {
      setCanGoBack(state.canGoBack)
      setCanGoForward(state.canGoForward)
    })

    return () => {
      offMax?.()
      offNav?.()
    }
  }, [isDesktop])

  const handleGoBack = (): void => {
    if (window.desktopAPI?.goBack) {
      void window.desktopAPI.goBack()
    } else if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  const handleGoForward = (): void => {
    if (window.desktopAPI?.goForward) {
      void window.desktopAPI.goForward()
    } else if (typeof window !== 'undefined') {
      window.history.forward()
    }
  }

  const handleMenuClick = (e: MouseEvent<HTMLButtonElement>, menuName: string): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (window.desktopAPI?.popupMenu) {
      void window.desktopAPI.popupMenu(menuName, rect.left, rect.bottom)
    }
  }

  const handleMinimize = (): void => {
    void window.desktopAPI?.minimize?.()
  }

  const handleMaximize = (): void => {
    void window.desktopAPI?.maximize?.()
  }

  const handleClose = (): void => {
    void window.desktopAPI?.close?.()
  }

  return (
    <header className={css.topBar} data-top-bar>
      <div className={css.leftCluster}>
        <button
          type="button"
          className={css.iconBtn}
          title={sidebarCollapsed ? t('topbar.openSidebar') : t('topbar.collapseSidebar')}
          aria-label={sidebarCollapsed ? t('topbar.openSidebar') : t('topbar.collapseSidebar')}
          onClick={onToggleSidebar}
        >
          <IconSidebarSplit />
        </button>

        <button
          type="button"
          className={css.iconBtn}
          title={t('topbar.back')}
          aria-label={t('topbar.back')}
          disabled={isDesktop && !canGoBack}
          onClick={handleGoBack}
        >
          <IconArrowLeft />
        </button>

        <button
          type="button"
          className={css.iconBtn}
          title={t('topbar.forward')}
          aria-label={t('topbar.forward')}
          disabled={isDesktop && !canGoForward}
          onClick={handleGoForward}
        >
          <IconArrowRight />
        </button>

        <nav className={css.menuGroup} aria-label={t('topbar.appMenu')}>
          {MENU_ITEMS.map(item => (
            <button
              key={item.key}
              type="button"
              className={css.menuBtn}
              onClick={(e) => { handleMenuClick(e, item.name) }}
            >
              {t(item.key)}
            </button>
          ))}
        </nav>
      </div>

      <div
        className={css.dragSpacer}
        onDoubleClick={handleMaximize}
      />

      <div className={css.windowControls} aria-label={t('topbar.windowControls')}>
        <button
          type="button"
          className={css.controlBtn}
          title={t('topbar.minimize')}
          aria-label={t('topbar.minimize')}
          onClick={handleMinimize}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          className={css.controlBtn}
          title={isMaximized ? t('topbar.restore') : t('topbar.maximize')}
          aria-label={isMaximized ? t('topbar.restore') : t('topbar.maximize')}
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <rect x="2.5" y="0.5" width="7" height="7" stroke="currentColor" strokeWidth="1" />
              <path d="M0.5 2.5V9.5H7.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`${css.controlBtn} ${css.closeBtn}`}
          title={t('topbar.close')}
          aria-label={t('topbar.close')}
          onClick={handleClose}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}
