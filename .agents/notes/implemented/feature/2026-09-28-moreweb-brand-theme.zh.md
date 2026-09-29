# Agent Note：moreweb 配色、字体与品牌界面

Status: implemented

[English](2026-09-28-moreweb-brand-theme.md) | 中文

## 问题

本 fork 的品牌化止步于字标。`ui-theme` 的 token 表仍然原样携带上游配色：所有链接、主按钮、思考流光、选中会话强调色都经 `--dsw-static-deepseek-*` 蓝色梯度解析，暗色表面是上游的中性灰，`--dsw-font-family` 是系统字体栈——除字标外，产品处处呈现 DeepSeek 蓝，而字标本身仍带着上游的"HARNESS"徽章且末字母被裁切。侧栏与 hero 品牌 mark 槽位不渲染任何内容（`OfficialBrandMark` 返回 null；`HeroShell` 从不渲染它收到的 mark 槽位），`BrandWordmark` 的 `includeMark` prop 文档写默认 true 但实际被忽略，Web favicon 仍是上游鲸鱼图形，桌面任务栏与安装包图标仍是上游的蓝色徽记。

## 决策

品牌身份跟随 moreweb 网站：暗黑偏紫表面上的紫色强调色，界面正文用 Poppins，代码用 Space Mono。取值放在样式规则规定的位置——`ui-theme` 的 token，而非组件 CSS：

- `design-platform.css` 新增 `--dsw-static-moreweb-*` 色阶（强调梯度 `50`–`900`，外加网站的确切表面族：base `rgb(3,0,5)`、raised `rgb(7,3,13)`、overlay `rgb(13,7,22)`、panel `rgb(20,10,32)`、selected `rgb(44,19,67)` 及其两级 hover）。两个主题下的语义别名全部重绑定：链接、`state-business-primary`、info 按钮对、聊天气泡、侧栏活动会话强调色，以及暗色滚动条 l1/l2 对；暗色 base/layers 采用网站表面族，浮层 chrome token（`tip`、`selector`、`input-major`、`toast`/`tooltip-bg`、`multi-select`、`module-platform`）跟随同一梯级，高度阶梯保持为一套。死亡的 `--dsw-static-deepseek-*` 梯度删除；`dshmarket` 与所有特性组件只消费 `--dsw-alias-*` 名称，因此没有消费方需要改动。
- `base.css` 将 `--dsw-font-family` 设为 Poppins 优先、`--ds-font-family-code` 设为 Space Mono 优先，保留 CJK 系统字体尾栈。latin woff2 子集（Poppins 100/400/500/600/700、Space Mono 400/700）随 `apps/web/public/fonts/` 分发，OFL-1.1 许可文本置于同目录；`THIRD_PARTY_NOTICES.md` 经通知生成器新增 vendored-font-assets 一节。
- 其余直接消费 static 的位置改经别名解析：ChatView 思考渐变与 StateDot 运行中颜色读取 `state-business-primary`/`-tertiary`。
- `BrandMark`（新增于 `ui-primitives`）绘制网站 mark——暗色底板上的渐变"m"图形——渐变 id 经 `useId` 作用域化，多实例可共存。`BrandWordmark` 实装 `includeMark`（mark + 名称）并删除上游徽章；`ui-brand-official` 以真实 mark 占据侧栏 mark 槽位并注册 hero mark，`HeroShell` 在空会话标题上方渲染它（渲染器缺席或槽位无占用者时容器整体收起，堆叠间距不会为空座位预留）。
- Web favicon 换为网站的 mark svg；`scripts/generate-desktop-icons.py` 以同一几何（贝塞尔采样渐变描边、青色圆点）重绘 512px 底板并重新生成 `icon.png`/`icon.ico`。桌面启动页拼出完整品牌（此前"moreweb"七个字母只渲染了四个）、错误徽章改用紫色、并只加载本地字体（Google Fonts 网络链接移除）。

## 备选方案

**直接改组件 CSS。** [docs/web-styling.md](../../../../docs/web-styling.zh.md) 否决：特性样式表只读语义别名，值由主题持有。改 token 一次性重绑定所有消费方，并保持明暗两套一致。

**保留 deepseek 梯度与 moreweb 梯度并存。** 别名重绑定与两处组件修正之后，再无任何消费方引用它；保留无人引用的色阶违背“每个事实只有一个家”的规则。

**经 `ctx.theme` 注册第三方主题而非重绑定内置主题。** 内置明暗对是产品自身的身份，不是附加件；覆盖层是为想叠加自有主题的组合准备的。

**保留鲸鱼 favicon 与鱼形图标作为后备。** fork 在提交 89778758f5 中已把鱼形移出侧栏；把这些图形留作未用的导出与陈旧图标，使品牌分裂在两套身份之间。

## 后果

亮色模式保持白色表面配紫色强调梯度（链接与填充使用可作正文的 `moreweb-500`）；暗色模式采用网站表面族，以 `moreweb-450`（`#bf00ff`）为强调色。高度阶梯滚动条规范仍然成立，因为浮层 chrome token 仍解析到 layer-2/3 梯级——该规范的调色板阶梯推导会抓住未来任何离开梯级的 token。Poppins 只覆盖 latin；CJK 文本按字形回落到系统字体尾栈，zh 用户在同一布局度量内继续获得 PingFang SC/Microsoft YaHei 渲染。字标的名称宽度是带余量的实测常量（`NAME_WIDTH`）；Poppins 度量更宽的引擎会渲染进余量而不是被裁切。
