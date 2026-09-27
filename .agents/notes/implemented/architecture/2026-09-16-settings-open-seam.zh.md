# Agent Note: The settings-open service and a real-target nav cluster

Status: implemented

[English](2026-09-16-settings-open-seam.md) | 中文

## 问题

侧边栏导航集群的按钮在提交 89778758f5 中作为视觉占位发布：「拉取请求」「定时任务」与「通知」在客户端没有任何支撑功能，「插件」也只是通过在 DOM 里查询可访问名称与本地化文案匹配的按钮来打开 Settings——该查询在任何文案变化时都会失效，且无法选中某个导航分区。Settings 模态的打开状态是组件局部的，因此 ui-settings-general 之外的插件完全无法打开 Settings，更不用说直达某个分区。

另外，框架的顶栏直接读取英文字典而不是框架的 locale seat，因此无论当前语言是什么，其文案始终是英文——违反了其他所有客户端表面遵循的 locale-owned-copy 规则。

## 决策

ui-settings-general 的外壳条目声明一个 store（`createSettingsShellStore`），承载模态打开状态与当前分区 id，替代组件局部的 `useState` 对。该条目的 inject 工厂把 store 的绑定 actions 交给对外提供的 `SettingsUIController`——与 ui-layout 把 `ctx.layout` 接到根条目 store 的装配方式一致。Service Definition——`ISettingsUI` 接口及其 Context 槽位 `ctx.settingsUI`——位于设置领域底座（ui-settings 的 `src/client/contract/settings-ui.ts`），而不是提供方包：ui-settings-general 的外壳约定已经为 SlotMap 合而类型导入 ui-sidebar，放在那里声明会让每条 ui-sidebar → ui-settings-general 引用闭合 TypeScript project-reference 环（TS6202）。底座出于同一原因持有其他所有设置约定，且不依赖任何 `ui-*` 呈现包。

`ctx.settingsUI.open(sectionId?)` 打开模态并可选地选中导航分区；不带参数的 `open()` 保持当前选择，`close` 清空选择，因此再次直接打开时从第一行开始（面板的渲染时投影在请求的 id 没有注册方时回退到第一行）。外壳条目接好 actions 之前调用该服务会抛出错误——这是启动顺序缺陷，不是需要容忍的竞态。

导航集群现在只承载真实目标：「插件」调用 `openSettings('plugins')`，「探索」调用 `openSettings('market')`（内置 dshmarket 分区以 id `market` 注册 `settings.section`）；「新会话」保持 New Session 操作。「拉取请求」「定时任务」与「通知」连同其字典键与图标一并移除，而不是留成死控件——无响应的控件读起来像坏了，而不是像路线图。

顶栏文案移入根注册声明的 `layout` locale namespace，插件在同一 apply 中注册其字典，因此顶栏与其他表面一样接收框架 `t` seat 并跟随当前语言；AppFrame 的产品标题仍经命名空间查找链读取 `common.brand.localBuild`。

## 备选方案

**保留占位集群直到真实功能存在。** 推迟接线会让用户面对什么都不做的按钮，而「接好子集 + 移除其余」比两个极端都更接近完成。重新引入一行导航是纯增量：注册功能、加键、渲染行。

**保留「插件」的 DOM 查询但选中分区。** 该查询无法指名分区，在本地化可访问名称变化时失效，还跨越了组合规则禁止的 slot 边界。服务调用比它替换的 querySelector 更短。

**通过 slot 而不是服务打开 Settings。** 模态是外壳自己的查看状态；slot 贡献会把打开设置变成渲染关注点，并让侧边栏获得对外壳界面框架的权限。单命令服务与 `ctx.layout` 在完全相同形状上的先例一致。

**在 ui-settings-general 声明接口并接受环。** TypeScript project reference 中的环会直接构建失败（TS6202），打破它要么把外壳约定移出其所属包，要么丢弃侧边栏的类型化 owner share。把 Service Definition 移到底座遵循设置约定的既有归属规则。

**让顶栏继续用英文字典。** 直接导入的形式违背 locale-owned-copy 门禁的精神，并把某一语言的文案钉在所有用户都看到的表面上。namespace 形式只花一行注册，并与所有相邻表面一致。

## 结果

侧边栏的每一行导航现在都执行其宣传的操作，任何插件都可以经 `ctx.settingsUI` 在指名分区上打开 Settings——未来「定时任务列表」或「通知中心」会经同一接缝接入，而不是重新引入死界面。设置模态的打开状态没有获得此前不具备的持久性（仍是瞬时的、重载即重置），store 形式也没有改变面板本身的任何可见行为。

被移除的三行在其功能存在之前不会回来：日程列表视图与通知中心会经同一接缝重新进入。字典键 `nav.pullRequests`、`nav.scheduled` 与 `nav.notifications` 随之删除，locale 文件不再携带无用文案。

顶栏文案现在中英完整，并像外壳其余部分一样跟随当前语言；其 `layout` namespace 以十四个键为启动图增加了一本字典。
