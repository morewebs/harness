# Agent Note：桌面启动加固与桥接清理

Status: implemented

[English](2026-09-28-desktop-boot-hardening.md) | 中文

## 问题

Electron 外壳在若干路径上会挂起或静默无动作。`ServerManager.start()` 接受任意 `DSH_DESKTOP_SERVER_URL` 字符串，在启动仍在打印 URL 时再次调用会再拉起一个后端，且永不超时——一个未打印 URL 就卡住的后端让启动页永远停在 `starting` 且没有任何诊断。“打开日志目录”在外部服务器模式下对不存在的路径调用 `showItemInFolder`（静默无动作）。preload 暴露了三个无人调用的桥接成员（`openHomeFolder`、`openExternal`、`getVersion`），`CmdOrCtrl+Shift+R` 加速键与 View 菜单的 forceReload 冲突（键盘强制刷新不可达），`electron-builder.yml` 把 `../web/dist` 复制进安装包却没有任何消费方，桌面还显式把遥测默认**开启**（`DSH_TELEMETRY_DISABLED ?? '0'`），与产品的本地优先定位相悖。

## 决策

- `start()` 校验外部 URL 的协议（http/https），否则带原始值让启动页失败；启动在 `DSH_DESKTOP_START_TIMEOUT_MS`（默认 90000）内未打印 URL 即带 stderr 尾部拒绝，并经 `stop()` 拆除挂死的子进程；并发的 `start()` 调用加入进行中的 Promise 而非再拉起一个后端。拉起的子进程的 `DSH_TELEMETRY_DISABLED` 默认 `'1'`：遥测为自愿开启，与产品发布的隐私立场一致。
- “打开日志”（菜单与启动页 IPC）检查 `hasLogFile()`：有日志时在文件管理器中定位该文件；没有时（外部模式）打开日志所在目录——真实动作而非无操作。
- 死亡桥接成员离开 preload（ESM 与 CJS 两份），随之删除 `dsh:open-home-folder`/`dsh:open-external`/`dsh:get-version` IPC 处理器；剩余每个通道都恰有一个渲染方或启动页消费方。重启加速键移至 `CmdOrCtrl+Alt+R`，让出 View 的 forceReload 绑定。
- 安装包中无人消费的 `web-dist` extraResource 移除。

## 备选方案

**在窗口加载时而非 start() 内校验外部 URL。** 协议检查属于值进入进程的位置；loadURL 自身的失败对启动页来说太晚且无法自我解释。

**超时后直接 SIGKILL。** `stop()` 已经拥有带平台树杀的先礼后兵拆除路径；复用它只保留一条终止路径，也让 exit 处理器继续记录日志。

**为未来功能保留未用的桥接成员。** 面向客户端表面的导出规则同样适用于 preload：无人调用，而且每个成员都是一对需要手工同步的 `index.ts`/`index.cjs`。

## 后果

外部服务器模式对畸形 URL 快速失败而非加载它；卡死的后端在预算内带 stderr 尾部浮出真实错误；超时后的重试可用，因为挂死子进程已被清除。桌面 spec 覆盖新行为（协议拒绝、超时与遥测默认断言、并发启动单次拉起）。遥测现在需要显式 `DSH_TELEMETRY_DISABLED=0` 才会运行。
