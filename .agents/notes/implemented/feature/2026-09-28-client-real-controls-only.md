# Agent Note: The client and desktop shell carry only real controls

Status: implemented

English | [中文](2026-09-28-client-real-controls-only.zh.md)

## Problem

The TopBar shipped unconditionally, so a plain `dsh web` browser page carried desktop-window chrome with no backing: the File/Edit/View/Help triggers and the minimize/maximize/close buttons called only `window.desktopAPI` (absent in a browser), and back/forward were enabled with no SPA history to traverse — enabled-but-inert buttons on the primary browser surface. The sidebar header carried a Search button that focused the workspace search input through a `querySelector` over localized placeholder text; the input is mounted but collapsed until the browsing region expands it, so the click visibly did nothing. The brand button rendered a chevron-down that suggested a menu that does not exist, five locale keys had no consumer, and the Settings nav gave the market section the generic gear icon while the sidebar gave it the sparkle.

## Decision

The fork's own rule — dead controls read as broken, not as a roadmap — applies to every surface:

- AppFrame mounts the TopBar only where the desktop bridge exists (`window.desktopAPI?.isDesktop`), marks the frame with `data-top-bar`, and the overlay inset and drag-handle offsets key off that attribute, so the browser surface gets its full viewport and no inert chrome. TopBar drops the browser-history fallbacks (they can no longer be reached) and its chrome colors move from hardcoded literals to theme tokens, so the bar follows the active palette like every other surface.
- The sidebar header Search button is removed rather than rewired: the workspace browsing region directly below already owns the same affordance in both wide and rail states (its own search toggle, and the rail search that expands-and-focuses), so the header copy was a duplicate whose DOM-probe implementation could not survive copy changes. The decorative brand chevron goes with it, and the five dead dictionary keys (`sidebar.session.new`, `workspace.section.pinned`, `workspace.empty.noMatches`, `workspace.sessions.count.one/.other`) are deleted with their zh/en entries.
- The Settings nav maps the `market` section to the same sparkle glyph the sidebar uses, so "Explore" and its destination read as one feature.
- `workspace.group.ungrouped` returns to "Ungrouped" and `workspace.section.workspaces` to "Workspaces" in the English dictionary: a fork commit had renamed them to "Recents" and "Projects" — the first a value `section.recents` already owns, the second a product rename the zh side (`工作区`) never followed — leaving the two languages naming both sections differently and diverging from the recorded e2e expectations that pin the upstream names.

## Alternatives considered

**Hide the dead controls with CSS instead of not mounting them.** Hidden-but-mounted controls keep shipping their locale keys, tests, and bridge calls for a mode that never uses them; not mounting removes the whole cost and lets the frame attribute state the fact for layout.

**Rewire the header Search through a uiWorkspace service action.** That adds a service surface whose only caller sits one row above the region that already owns the interaction. The honest fix for a duplicated affordance is removal; reintroducing a global search later gets its own seam.

**Gate on `window.desktopAPI` presence rather than `isDesktop`.** The preload sets `isDesktop: true` in the same breath as exposing the bridge; TopBar already used the flag, so the mount gate reuses the established meaning.

## Consequences

A browser session renders sidebar + conversation with no title bar: the sidebar's own panel toggle covers collapse, and the app reads as a plain web app. Desktop builds are unchanged — the bar, its drag region, and its controls mount exactly as before, now themed. The sidebar snapshot loses the search button and chevron nodes; rail users keep the rail's own search affordance. Nothing reintroduces a placeholder: a future global search or nav row reenters through the settings-open seam exactly as the previous note recorded.
