# Agent Note：客户端与桌面外壳只携带真实控件

Status: implemented

[English](2026-09-28-client-real-controls-only.md) | 中文

## 问题

TopBar 无条件挂载，因此普通 `dsh web` 浏览器页面携带了没有支撑的桌面窗口 chrome：File/Edit/View/Help 触发与最小化/最大化/关闭按钮只调用 `window.desktopAPI`（浏览器中不存在），前进/后退在 SPA 无历史记录可遍历时仍为启用态——主浏览器表面上满是“可点但无动作”的按钮。侧栏头部还有一个搜索按钮，它通过对本地化占位文本的 `querySelector` 去聚焦工作区搜索输入框；该输入框在浏览区域展开前始终挂载但收起，点击后看不到任何反应。品牌按钮渲染了一个暗示不存在菜单的下拉箭头，五个语言键没有消费方，Settings 导航给 market 分区用了通用齿轮图标而侧栏给它的是闪光图形。

## 决策

本 fork 自己的规则——无用控件读起来是损坏而非路线图——适用于所有表面：

- AppFrame 仅在桌面桥接存在时挂载 TopBar（`window.desktopAPI?.isDesktop`），为 frame 标记 `data-top-bar`，浮层 inset 与拖动把手偏移都以该属性为键，浏览器表面获得完整视口且没有无用 chrome。TopBar 删除浏览器历史回退（已不可达），其 chrome 颜色从硬编码字面值改为主题 token，与其他表面一样跟随活动调色板。
- 侧栏头部搜索按钮被移除而非重新接线：正下方的工作区浏览区域在宽态与栏态都已拥有同一交互（自己的搜索开关，以及展开并聚焦的栏内搜索），头部这份是重复入口，其 DOM 探测实现也经不起文案变化。装饰性品牌下拉箭头一并移除，五个死亡字典键（`sidebar.session.new`、`workspace.section.pinned`、`workspace.empty.noMatches`、`workspace.sessions.count.one/.other`）连同 zh/en 条目删除。
- Settings 导航把 `market` 分区映射为侧栏使用的同一闪光图形，"Explore"与其目的地读作同一功能。
- `workspace.group.ungrouped` 在英文词典中恢复为 "Ungrouped"、`workspace.section.workspaces` 恢复为 "Workspaces"：此前的 fork 提交把它们改成了 "Recents" 与 "Projects"——前者是 `section.recents` 已持有的值，后者是一次 zh 一侧（`工作区`）从未跟随的产品改名——导致两种语言对两个分区使用不同名称，并与钉住上游名称的既有 e2e 期望分道扬镳。

## 备选方案

**用 CSS 隐藏无用控件而不是不挂载。** 隐藏但仍挂载的控件会继续为永远不会使用它们的模式运送语言键、测试与桥接调用；不挂载移除全部成本，并让 frame 属性为布局陈述事实。

**经 uiWorkspace 服务动作重接头部搜索。** 这会为一个唯一调用方就在正下方区域之上的交互增加服务面。重复交互的诚实修法是移除；将来重新引入全局搜索时再走它自己的接缝。

**以 `window.desktopAPI` 是否存在而非 `isDesktop` 判定。** preload 在暴露桥接的同时置 `isDesktop: true`；TopBar 已在使用该标志，挂载门复用既有语义。

## 后果

浏览器会话渲染侧栏 + 会话区且没有标题栏：侧栏自己的面板开关覆盖折叠，应用读起来是普通 Web 应用。桌面构建不变——标题栏、拖动区域与控件照旧挂载，只是改为主题化。侧栏快照失去搜索按钮与箭头节点；栏态用户保留栏内自己的搜索交互。任何东西都不会以占位形式回归：未来的全局搜索或导航行按前一条笔记记录的那样，经 settings-open 接缝重新进入。
