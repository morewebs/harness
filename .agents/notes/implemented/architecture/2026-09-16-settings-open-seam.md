# Agent Note: The settings-open service and a real-target nav cluster

Status: implemented

English | [中文](2026-09-16-settings-open-seam.zh.md)

## Problem

The sidebar's nav-cluster buttons shipped in commit 89778758f5 as visual placeholders: "Pull requests", "Scheduled", and "Notifications" had no backing feature anywhere in the client, and "Plugins" opened Settings only by querying the DOM for a button whose accessible name matched localized text — a lookup that breaks on any copy change and cannot select a nav section. The Settings modal's open state was component-local, so no plugin outside ui-settings-general could open Settings at all, let alone land on a section.

Separately, the frame's TopBar read the English locale dictionary directly instead of the framework locale seat, so its copy stayed English under every active locale — a violation of the locale-owned-copy rule every other client surface follows.

## Decision

ui-settings-general's shell entry declares a store (`createSettingsShellStore`) holding modal open state and the active section id, replacing the component-local `useState` pair. The entry's inject factory hands the store's bound actions to a provided `SettingsUIController`, the same assembly ui-layout uses to wire `ctx.layout` to the root entry's store. The Service Definition — the `ISettingsUI` face and its Context slot `ctx.settingsUI` — lives in the settings domain base (ui-settings, `src/client/contract/settings-ui.ts`), not in the provider package: ui-settings-general's shell contract already type-imports ui-sidebar's SlotMap merge, so a face declared there would make every ui-sidebar → ui-settings-general reference close a TypeScript project-reference cycle (TS6202). The base layer owns every other settings contract for the same reason and depends on no `ui-*` presentation package.

`ctx.settingsUI.open(sectionId?)` opens the modal and optionally selects a nav section; a bare `open()` keeps the current selection, and `close` clears it so a plain reopen starts at the first row (the panel's render-time projection falls back to the first row when the requested id has no registrant). Calling the service before the shell entry wired its actions throws — a boot-order bug, not a race to tolerate.

The nav cluster now carries only real targets: "Plugins" calls `openSettings('plugins')` and "Explore" calls `openSettings('market')` (the built-in dshmarket section registers `settings.section` with id `market`); "New chat" keeps the New Session action. "Pull requests", "Scheduled", and "Notifications" are removed with their dictionary keys and icons rather than left inert — dead controls read as broken, not as a roadmap.

TopBar copy moved to a `layout` locale namespace the root registration declares and the plugin registers in the same apply, so the bar receives the framework `t` seat like every other surface and follows the active locale; AppFrame still reads `common.brand.localBuild` for the product title through the namespace lookup chain.

## Alternatives considered

**Keep the placeholder cluster until real features exist.** Deferring wiring would leave the user with buttons that do nothing, and the wired subset (Plugins, Explore) plus removal is strictly closer to done than either extreme. Reintroducing a nav row is additive: register the feature, add the key, render the row.

**Keep the DOM lookup for Plugins but target the tab.** The lookup cannot name a section, breaks when localized accessible names change, and reaches across the slot boundary the composition rules forbid. The service call is shorter than the querySelector it replaces.

**Open Settings through a slot instead of a service.** The modal is the shell's own viewing state; a slot contribution would make opening settings a render concern and give the sidebar authority over shell chrome. The one-command service matches `ctx.layout`'s precedent for exactly this shape.

**Declare the face in ui-settings-general and eat the cycle.** A cycle in TypeScript project references fails the build outright (TS6202), and breaking it would require either moving the shell contract out of the package that owns it or dropping the sidebar's typed owner share. Moving the Service Definition to the base layer follows the existing ownership rule for settings contracts.

**Leave TopBar on the English dictionary.** The direct-import form fails the spirit of the locale-owned-copy gate and pins one locale's copy in a surface every user sees. The namespace form costs one registration line and matches every neighboring surface.

## Consequences

Every sidebar nav row now performs its advertised action, and any plugin can open Settings at a named section through `ctx.settingsUI` — the seam a future "scheduled tasks" view or notification center would use instead of reintroducing dead chrome. The settings modal's open state survives nothing it did not survive before (still transient, still resets on reload), and the store form changes no visible behavior in the panel itself.

The three removed rows are gone until their features exist: a schedule list view and a notifications center would reenter through the same seam. The dictionary keys `nav.pullRequests`, `nav.scheduled`, and `nav.notifications` are deleted with them, so locale files stay free of unused copy.

TopBar copy is now zh/en complete and follows the active locale like the rest of the shell; its `layout` namespace adds one more dictionary to the boot graph, at fourteen keys.
