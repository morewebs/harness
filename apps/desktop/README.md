# DSH Desktop

DeepSeek Harness Desktop application: native Electron shell for the web GUI and local agent service.

## Overview

DSH Desktop wraps the DeepSeek Harness interactive web interface and local agent runtime into a native desktop application for Windows. It provides:

- **Native Windows Desktop Window**: Clean desktop container with standard menus, developer tools, and navigation protection.
- **Managed Backend Subprocess**: Automatically locates, starts, and supervises the local `dsh web` service on an ephemeral loopback port (`--port 0 --no-open`).
- **Secure Token Exchange**: Seamlessly handles startup process token authentication and passes session cookies to the local browser window.
- **Installer Packages**: Produces both interactive setup `.exe` (NSIS) and Microsoft Windows Installer `.msi` packages.
- **Loading & Error Screen**: Displays real-time startup progress and actionable error diagnostics if the backend fails to boot.
- **External Server Mode**: Connects directly to an external or remote instance when `DSH_DESKTOP_SERVER_URL` is set.

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                      DSH Desktop                          │
│                                                           │
│  ┌───────────────────────┐      ┌──────────────────────┐  │
│  │     Main Process      │      │    BrowserWindow     │  │
│  │  - ServerManager      │◄────►│  - Splash Screen     │  │
│  │  - Window Management  │      │  - Web Client GUI    │  │
│  │  - Application Menu   │      │                      │  │
│  └───────────┬───────────┘      └──────────────────────┘  │
│              │                                            │
│              ▼ spawns / supervises                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  DSH Web Backend Subprocess                         │  │
│  │  - Cordis plugin container                          │  │
│  │  - HTTP API & WebSocket multiplexer                 │  │
│  │  - Agent loops, tools, presets, storage             │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Quick Start (Development)

From the repository root:

1. **Build the workspace packages and web frontend**:
   ```sh
   pnpm run build
   ```

2. **Compile the desktop application**:
   ```sh
   pnpm --filter @deepseek-ai/dsh-desktop run build
   ```

3. **Start the desktop application**:
   ```sh
   pnpm --filter @deepseek-ai/dsh-desktop run dev
   ```

## Packaging Installers (.exe and .msi)

To build the Windows installers:

```sh
pnpm --filter @deepseek-ai/dsh-desktop run build:dist
```

Installers will be generated in `apps/desktop/dist-installer/`:
- `DSH Desktop-Setup-<version>-x64.exe` (NSIS setup with custom directory, desktop shortcut, and uninstaller)
- `DSH Desktop-Setup-<version>-x64.msi` (Windows Installer package for enterprise / GPO deployment)

To test the unpacked application without creating an installer:
```sh
pnpm --filter @deepseek-ai/dsh-desktop run pack
```

## Customization Guide

If customizing this fork for your own organization:

1. **Product & Application Name**:
   - In `apps/desktop/package.json`: edit `"name"` and `"description"`.
   - In `apps/desktop/electron-builder.yml`: edit `productName` and `shortcutName`.
2. **Application ID**:
   - In `apps/desktop/electron-builder.yml`: edit `appId` (e.g. `com.yourcompany.app`).
3. **Application Icons**:
   - Replace `apps/desktop/build/icon.png` (512x512 PNG) and `apps/desktop/build/icon.ico` (multi-resolution ICO).
   - Or modify `scripts/generate-desktop-icons.py` and run `python scripts/generate-desktop-icons.py`.
4. **Custom Splash Screen**:
   - Customize `apps/desktop/src/renderer/loading.html` and `loading.css`.

## Environment Variables

| Variable | Description |
|---|---|
| `DSH_DESKTOP_SERVER_URL` | Skip spawning a local server and connect to an existing server (e.g., `http://127.0.0.1:8080`) |
| `DSH_BIN_PATH` | Explicit path to a `dsh` executable or script |
| `DSH_HOME` | Override user data root directory (defaults to `~/.dsh`) |
| `DSH_TELEMETRY_DISABLED` | Set to `1` to disable telemetry |
