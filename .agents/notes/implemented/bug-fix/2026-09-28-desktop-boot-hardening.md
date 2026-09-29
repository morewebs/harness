# Agent Note: Desktop boot hardening and bridge cleanup

Status: implemented

English | [中文](2026-09-28-desktop-boot-hardening.zh.md)

## Problem

The Electron shell could hang or silently no-op in several paths. `ServerManager.start()` accepted any `DSH_DESKTOP_SERVER_URL` string, spawned a second backend when called while a boot was still printing its URL, and never timed out — a backend that booted without printing left the splash in `starting` forever with no diagnostics. "Open Logs Directory" called `showItemInFolder` on a path that does not exist in external-server mode (silent no-op). The preload exposed three bridge members nothing calls anywhere (`openHomeFolder`, `openExternal`, `getVersion`), the `CmdOrCtrl+Shift+R` accelerator collided with the View menu's forceReload (keyboard force-reload unreachable), `electron-builder.yml` copied `../web/dist` into the installer though nothing consumes `web-dist`, and the desktop explicitly defaulted telemetry **on** (`DSH_TELEMETRY_DISABLED ?? '0'`), against the product's local-first positioning.

## Decision

- `start()` validates the external URL's scheme (http/https) and fails the splash with the offending value otherwise; a boot that does not print its URL within `DSH_DESKTOP_START_TIMEOUT_MS` (default 90000) rejects with the stderr tail and tears the hung child down through `stop()`; concurrent `start()` calls join the in-flight promise instead of spawning a second backend. Spawned children get `DSH_TELEMETRY_DISABLED` defaulting to `'1'`: telemetry is opt-in, matching the shipped product's privacy stance.
- "Open Logs" (menu and splash IPC) checks `hasLogFile()`: with a log it reveals the file, without one (external mode) it opens the logs directory the file would live in — a real action instead of a no-op.
- The dead bridge members leave the preload (both the ESM and CJS copies) and with them their `dsh:open-home-folder`/`dsh:open-external`/`dsh:get-version` IPC handlers; every remaining channel has exactly one renderer or splash consumer. The restart accelerator moves to `CmdOrCtrl+Alt+R`, freeing the View forceReload binding.
- The installer's dead `web-dist` extraResource is removed.

## Alternatives considered

**Validate the external URL at window-load time instead of in start().** The scheme check belongs where the value enters the process; loadURL's own failure is too late to explain itself in the splash.

**Kill a timed-out boot with SIGKILL inline.** `stop()` already owns graceful-then-force teardown with the platform tree-kill; reusing it keeps one kill path and lets the exit handler keep logging.

**Keep the unused bridge members for future features.** The export rule for client-facing surfaces applies to the preload too: nothing calls them, and each member is another `index.ts`/`index.cjs` pair to hand-sync.

## Consequences

External-server mode fails fast on a malformed URL instead of loading it; a wedged backend surfaces a real error with its stderr tail within the budget; retry after timeout works because the hung child is gone. The desktop spec covers the new behaviors (scheme rejection, timeout with telemetry-default assertion, single spawn under concurrent starts). Telemetry now requires an explicit `DSH_TELEMETRY_DISABLED=0` to run at all.
