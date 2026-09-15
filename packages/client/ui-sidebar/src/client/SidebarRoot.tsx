/**
 * Sidebar shell: column geometry only. Collapse is a slide plus crossfade:
 * content freezes at its expanded width (inline style) and fades out in place
 * while the sliding column (AppFrame grid tracks) clips it — nothing reflows
 * mid-slide. At settle the wide-only content unmounts and the four upper
 * controls enter the 56px rail from the same horizontal offset (one icon each,
 * same top-down order) on one fade that ends with the slide. The bottom-pinned
 * settings control only fades. The workspace/session browsing region between
 * the New Session button and the foot is the `sidebar.workspaces` registrant's,
 * and the foot holds `sidebar.settings` plus `sidebar.footer.action`; the shell
 * hands them the wide flag (plus an expand request callback for the browser).
 *
 * The column also owns whether the scroll regions nested in it draw a
 * scrollbar at all: the shell tracks the pointer and rebinds ui-theme's
 * scrollbar indirection away while it is elsewhere, so a list the user is not
 * pointing at carries no bar.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  IconBranchOutline16, IconChevronDownOutline14, IconClockOutline16,
  IconCordisPluginOutline14, IconEditOutline16, IconPanelLeftOutline16,
  IconSearchOutline16, IconSparkle16, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'

function IconBellOutline16({ size = 16, className }: { size?: number; className?: string | undefined }) {
  return (
    <svg width={size} height={size} viewBox="2 0.25 12 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 1.5C6.067 1.5 4.5 3.067 4.5 5V7.586L3.293 8.793A1 1 0 004 10.5h8a1 1 0 00.707-1.707L11.5 7.586V5c0-1.933-1.567-3.5-3.5-3.5zm-1.5 10a1.5 1.5 0 003 0h-3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPlusCircleOutline14({ size = 14, className }: { size?: number; className?: string | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}


import clsx from 'clsx'
import type { SidebarRootComponentProps } from './contract/slots.ts'
import css from './SidebarRoot.module.css'

/** Wrap the leading brand name in Poppins styling. */
function formatBrandText(text: string): ReactNode {
  const prefix = 'moreweb'
  if (text.startsWith(prefix)) {
    return (
      <>
        <span className={css.brandMoreweb}>{prefix}</span>
        {text.slice(prefix.length)}
      </>
    )
  }
  return text
}

/** Wide-content unmount delay; matches the 150ms wide-content fade-out. */
const COLLAPSE_SETTLE_MS = 150

/**
 * How long the column's scrollbars stay drawn after the pointer leaves it.
 * The bar is a pointer affordance here, and hiding it on the leave event
 * itself makes it blink out while the pointer is only crossing the column's
 * edge — on the way to the conversation, or around a portalled menu.
 */
const SCROLLBAR_LINGER_MS = 2000

/** Format complete-build metadata for the local brand badge. */
function localBuildVersion(): string | undefined {
  const version = process.env.DSH_CLIENT_VERSION
  if (version === undefined) return undefined
  const commit = process.env.DSH_CLIENT_COMMIT_HASH
  return version
    + (commit === undefined ? '' : `-${commit}`)
    + (process.env.DSH_CLIENT_GIT_DIRTY === 'true' ? '-dirty' : '')
}

/**
 * Render the sidebar column shell.
 * @param props - composed slot props (runtime share + injected callbacks, contract/slots.ts).
 * @returns the sidebar element tree.
 */
export function SidebarRoot({
  collapsed,
  width,
  startSession,
  toggleSidebar,
  t,
  renderSlot,
}: SidebarRootComponentProps) {
  // Wide content stays mounted while the collapse animates (fading via
  // .collapsed .wide), unmounts at settle, and remounts right away on expand.
  const [settled, setSettled] = useState(collapsed)
  useEffect(() => {
    if (!collapsed) { setSettled(false); return }
    const timer = window.setTimeout(() => { setSettled(true) }, COLLAPSE_SETTLE_MS)
    return () => { window.clearTimeout(timer) }
  }, [collapsed])
  const wide = !collapsed || !settled

  // Freeze the content at its expanded width while it fades out (collapsed
  // && wide): the sliding column then clips it instead of reflowing it. The
  // rail layout (.collapsed styles) only applies once the fade settles.
  const lastWideWidth = useRef(width)
  if (!collapsed) lastWideWidth.current = width

  // Rail-in only crossfades a live collapse: a refresh straight into the
  // collapsed state renders the rail statically (no delay-hidden icons).
  const everWide = useRef(!collapsed)
  if (!collapsed) everWide.current = true

  // Scrollbars in the column follow the pointer (.quietBars rebinds them
  // away): drawn while it is inside, and for SCROLLBAR_LINGER_MS after it
  // leaves. A pointer that returns within that window cancels the pending
  // hide rather than restarting from a hidden bar.
  const column = useRef<HTMLDivElement>(null)
  const [pointerInside, setPointerInside] = useState(false)
  const lingerTimer = useRef<number | undefined>(undefined)
  const armLinger = (): void => {
    if (lingerTimer.current !== undefined) return
    lingerTimer.current = window.setTimeout(() => {
      lingerTimer.current = undefined
      setPointerInside(false)
    }, SCROLLBAR_LINGER_MS)
  }
  const cancelLinger = (): void => {
    window.clearTimeout(lingerTimer.current)
    lingerTimer.current = undefined
  }
  // Leaving is decided by the column's BOX, not by DOM containment, and only
  // while the bars are drawn. ui-settings renders its full-viewport panel as a
  // fixed-position DESCENDANT of this column, so a pointer moved onto that
  // panel — or onto the conversation once it closes — fires no `pointerleave`
  // here, and the bars would stay drawn over a column nobody is pointing at.
  // The element's own leave stays as the one signal geometry cannot give: a
  // pointer that leaves the window emits no further moves.
  useEffect(() => {
    if (!pointerInside) return
    const onMove = (event: PointerEvent): void => {
      const rect = column.current?.getBoundingClientRect()
      /* v8 ignore next -- the listener only exists while the column is mounted and revealed. */
      if (rect === undefined) return
      const inside = event.clientX >= rect.left && event.clientX < rect.right
        && event.clientY >= rect.top && event.clientY < rect.bottom
      if (inside) cancelLinger()
      else armLinger()
    }
    document.addEventListener('pointermove', onMove)
    return () => {
      document.removeEventListener('pointermove', onMove)
      cancelLinger()
    }
  }, [pointerInside])

  const buildVersion = localBuildVersion()

  return (
    <div
      ref={column}
      className={clsx(
        css.root, !wide && css.collapsed, !wide && everWide.current && css.railIn,
        collapsed && wide && css.fading, !pointerInside && css.quietBars,
      )}
      style={wide ? { width: collapsed ? lastWideWidth.current : width } : undefined}
      onPointerEnter={() => {
        cancelLinger()
        setPointerInside(true)
      }}
      onPointerLeave={() => { armLinger() }}
    >
      <div className={css.logoRow}>
        {/* Expanded, the brand doubles as a New Session shortcut; the
            collapsed rail's logo is the expand toggle below instead. */}
        {wide && (
          <button
            type="button"
            className={clsx(css.brand, css.wide)}
            aria-label={t('session.new.label')}
            onClick={() => { startSession() }}
          >
            <span className={css.brandIdentity} aria-hidden="true">
              <span className={css.brandMark}>
                {renderSlot('sidebar.brand.mark', { size: 24 }, { fallback: null })}
              </span>
              <span className={css.brandName}>
                {renderSlot('sidebar.brand.name', {}, {
                  fallback: buildVersion === undefined
                    ? (
                      <span className={css.fallbackBrandName}>
                        <span className={css.brandTitleWrap}>
                          {formatBrandText(t('brand.localBuild'))}
                          <IconChevronDownOutline14 className={css.brandChevron} size={13} />
                        </span>
                      </span>
                    )
                    : (
                      <span className={css.localBuildBrand}>
                        <span className={css.localBuildTitle}>
                          <span className={css.brandTitleWrap}>
                            {formatBrandText(t('brand.localBuild'))}
                            <IconChevronDownOutline14 className={css.brandChevron} size={13} />
                          </span>
                        </span>
                        <span className={css.buildVersion}>{buildVersion}</span>
                      </span>
                    ),
                })}
              </span>
            </span>
          </button>
        )}
        <div className={css.headerTrailingActions}>
          {wide && (
            <>
              <Tooltip label={t('search')} delayMs={500}>
                <button
                  type="button"
                  className={css.headerActionButton}
                  aria-label={t('search')}
                  onClick={() => {
                    const searchInput = column.current?.querySelector<HTMLInputElement>('input[placeholder*="Search"], input[placeholder*="搜索"]')
                    if (searchInput) {
                      searchInput.focus()
                    } else {
                      const searchBtn = column.current?.querySelector<HTMLButtonElement>('button[aria-label*="Search"], button[aria-label*="搜索"]')
                      searchBtn?.click()
                    }
                  }}
                >
                  <IconSearchOutline16 size={15} />
                </button>
              </Tooltip>
              <Tooltip label={t('nav.notifications')} delayMs={500}>
                <button
                  type="button"
                  className={css.headerActionButton}
                  aria-label={t('nav.notifications')}
                >
                  <IconBellOutline16 size={16} />
                </button>
              </Tooltip>
            </>
          )}
          {/* Rail resting state is the brand mark or panel toggle icon. */}
          <Tooltip label={collapsed ? t('toggle.open') : t('toggle.collapse')} delayMs={500}>
            <button
              type="button"
              className={clsx(css.iconButton, css.toggle)}
              aria-label={collapsed ? t('toggle.open') : t('toggle.collapse')}
              onClick={() => { toggleSidebar() }}
            >
              {!wide && (
                <span className={css.railMark} aria-hidden="true">
                  {renderSlot('sidebar.brand.mark', { size: 24 }, { fallback: null })}
                </span>
              )}
              {/* Rail icons render at 18 (figma rail spec); expanded keeps the glyph-native sizes. */}
              <IconPanelLeftOutline16 className={css.panelIcon} size={wide ? 15 : 18} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={clsx(css.navCluster, !wide && css.navClusterCollapsed)}>
        {/* Expanded, the button carries its own label — tooltip only on the rail. */}
        <Tooltip label={t('session.new.label')} delayMs={500} disabled={wide}>
          <button
            type="button"
            className={clsx(css.newSession, wide && css.codexNavItem)}
            aria-label={t('session.new.label')}
            onClick={() => { startSession() }}
          >
            <span className={css.navLeading}>
              <IconEditOutline16 size={wide ? 16 : 18} />
              {wide && <span className={clsx(css.newSessionLabel, css.navItemLabel, css.wide)}>{t('nav.newChat')}</span>}
            </span>
            {wide && <IconPlusCircleOutline14 size={14} className={css.navPlusIcon} />}
          </button>
        </Tooltip>

        {wide && (
          <>
            <button type="button" className={css.codexNavItem}>
              <span className={css.navLeading}>
                <IconBranchOutline16 size={16} />
                <span className={css.navItemLabel}>{t('nav.pullRequests')}</span>
              </span>
            </button>
            <button type="button" className={css.codexNavItem}>
              <span className={css.navLeading}>
                <IconClockOutline16 size={16} />
                <span className={css.navItemLabel}>{t('nav.scheduled')}</span>
              </span>
            </button>
            <button
              type="button"
              className={css.codexNavItem}
              onClick={() => {
                const settingsBtn = column.current?.querySelector<HTMLButtonElement>('[aria-label*="Settings"], [aria-label*="设置"]')
                settingsBtn?.click()
              }}
            >
              <span className={css.navLeading}>
                <IconCordisPluginOutline14 size={16} />
                <span className={css.navItemLabel}>{t('nav.plugins')}</span>
              </span>
            </button>
            <button type="button" className={css.codexNavItem}>
              <span className={css.navLeading}>
                <IconSparkle16 size={16} />
                <span className={css.navItemLabel}>{t('nav.explore')}</span>
              </span>
            </button>
          </>
        )}
      </div>


      {/* The browsing region fills the column between the controls and the
          foot in both states; its rail icon column rides the same slot. */}
      <div className={css.regionArea}>
        {renderSlot('sidebar.workspaces', {
          wide,
          expandSidebar: () => { if (collapsed) toggleSidebar() },
        })}
      </div>

      {/* Footer actions stack above Settings in both sidebar widths. */}
      <div className={css.footArea}>
        <div className={css.footerActions}>
          {renderSlot('sidebar.footer.action', { wide })}
        </div>
        <div className={css.settingsArea}>
          {renderSlot('sidebar.settings', { wide })}
        </div>
      </div>
    </div>
  )
}
