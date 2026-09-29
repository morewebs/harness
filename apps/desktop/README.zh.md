# moreweb Desktop

[English](README.md) | 中文

moreweb harness 桌面应用：为 Web GUI 与本地 agent 服务提供原生 Electron 外壳。

## 概述

moreweb Desktop 将 moreweb harness 的交互式 Web 界面与本地 agent 运行时封装为 Windows 原生桌面应用。它提供：

- **原生 Windows 桌面窗口**：整洁的桌面容器，带标准菜单、开发者工具与导航保护。
- **托管的后端子进程**：自动定位、启动并监护本地 `dsh web` 服务，使用临时回环端口（`--port 0 --no-open`）。
- **安全的令牌交换**：无缝处理启动进程的令牌认证，并把会话 cookie 传递给本地浏览器窗口。
- **安装包**：同时产出交互式安装 `.exe`（NSIS）与 Microsoft Windows Installer `.msi` 包。
- **加载与错误界面**：显示实时启动进度；后端启动失败时给出可操作的诊断信息。
- **外部服务器模式**：设置 `DSH_DESKTOP_SERVER_URL` 时直接连接外部或远程实例。

## 架构

```
┌───────────────────────────────────────────────────────────┐
│                   moreweb Desktop                         │
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
│  │  moreweb Web Backend Subprocess                     │  │
│  │  - Cordis plugin container                          │  │
│  │  - HTTP API & WebSocket multiplexer                 │  │
│  │  - Agent loops, tools, presets, storage             │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## 快速开始（开发）

在仓库根目录：

1. **构建工作区包与 Web 前端**：
   ```sh
   pnpm run build
   ```

2. **编译桌面应用**：
   ```sh
   pnpm --filter @deepseek-ai/dsh-desktop run build
   ```

3. **启动桌面应用**：
   ```sh
   pnpm --filter @deepseek-ai/dsh-desktop run dev
   ```

## 打包安装器（.exe 与 .msi）

构建 Windows 安装器：

```sh
pnpm --filter @deepseek-ai/dsh-desktop run build:dist
```

安装器生成在 `apps/desktop/dist-installer/`：
- `moreweb Desktop-Setup-<version>-x64.exe`（NSIS 安装器，支持自定义目录、桌面快捷方式与卸载程序）
- `moreweb Desktop-Setup-<version>-x64.msi`（面向企业 / GPO 部署的 Windows Installer 包）

不生成安装器、仅测试解包后的应用：

```sh
pnpm --filter @deepseek-ai/dsh-desktop run pack
```

## 定制指南

若要为你的组织定制本分叉：

1. **产品与应用名称**：
   - 在 `apps/desktop/package.json` 中修改 `"name"` 与 `"description"`。
   - 在 `apps/desktop/electron-builder.yml` 中修改 `productName` 与 `shortcutName`。
2. **应用 ID**：
   - 在 `apps/desktop/electron-builder.yml` 中修改 `appId`（例如 `com.yourcompany.app`）。
3. **应用图标**：
   - 替换 `apps/desktop/build/icon.png`（512x512 PNG）与 `apps/desktop/build/icon.ico`（多分辨率 ICO）。
   - 或修改 `scripts/generate-desktop-icons.py` 后运行 `python scripts/generate-desktop-icons.py`。
4. **自定义启动画面**：
   - 定制 `apps/desktop/src/renderer/loading.html`（样式内联于该文件）。

## 环境变量

| 变量 | 说明 |
|---|---|
| `DSH_DESKTOP_SERVER_URL` | 跳过本地服务器启动，连接既有服务器（例如 `http://127.0.0.1:8080`） |
| `DSH_BIN_PATH` | 显式指定 `dsh` 可执行文件或脚本的路径 |
| `DSH_HOME` | 覆盖用户数据根目录（默认 `~/.dsh`） |
| `DSH_TELEMETRY_DISABLED` | 遥测默认关闭；设为 `0` 以启用 |
| `DSH_DESKTOP_START_TIMEOUT_MS` | 后端启动超时预算（默认 90000） |
