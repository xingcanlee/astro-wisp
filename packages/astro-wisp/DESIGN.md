---
name: Wisp
description: 中文优先的技术博客主题，按一本装订好的技术参考手册来排：书眉、章节号、编号目录、三线表、代码清单。
colors:
  paper: '#fcfcfb'
  paper-dark: '#111214'
  surface: '#f4f4f2'
  surface-dark: '#18191c'
  surface-2: '#ebebe7'
  surface-2-dark: '#202125'
  rule: '#e2e2dd'
  rule-dark: '#2b2d31'
  ink: '#1d1d1f'
  ink-dark: '#e6e6e3'
  muted: '#5c6067'
  muted-dark: '#a0a4ab'
  subtle: '#8b9098'
  subtle-dark: '#6b7078'
  accent: '#0f766e'
  accent-dark: '#4fd1c0'
  accent-fg: '#ffffff'
  accent-fg-dark: '#0b1f1d'
  code-bg: '#f6f6f4'
  code-bg-dark: '#16171a'
  selection: '#ccf0ea'
  selection-dark: '#1d3d39'
typography:
  home-title:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif'
    fontSize: 'clamp(2.5rem, 1.6rem + 3.6vw, 4rem)'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0em'
  chapter-title:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif'
    fontSize: 'clamp(1.75rem, 1.25rem + 1.8vw, 2.25rem)'
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: '0em'
  chapter-number:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '1.5em'
    fontWeight: 300
    lineHeight: 1
  h2:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.3
  h3:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif'
    fontSize: '1.1875rem'
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, PingFang SC, HarmonyOS Sans SC, MiSans, Microsoft YaHei, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: '0em'
  section-title:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.35
  lead:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.7
  ui-large:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  ui-small:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.5
  prose-h1:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.3
  diagram-label:
    fontFamily: 'Inter Variable, Noto Sans SC Variable, sans-serif'
    fontSize: '14px'
    fontWeight: 600
    lineHeight: 1.4
  code:
    fontFamily: 'JetBrains Mono Variable, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.7
rounded:
  focus: '2px'
  mark: '3px'
  box: '4px'
  scrollbar: '999px'
spacing:
  unit: '4px'
  xs: '8px'
  sm: '12px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  section: '80px'
  measure: '42rem'
  side: '14rem'
  gutter: '4rem'
  header: '56px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-fg}'
    rounded: '{rounded.box}'
    padding: '0 18px'
    height: '44px'
  button-secondary:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.box}'
    padding: '0 18px'
    height: '44px'
  code-listing:
    backgroundColor: '{colors.code-bg}'
    textColor: '{colors.ink}'
    typography: '{typography.code}'
    rounded: '{rounded.box}'
  inline-code:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.mark}'
    padding: '0.125em 0.3em'
  note-block:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.box}'
    padding: '0.125em 1.25em'
  header:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    height: '{spacing.header}'
---

# Design System: Wisp

> 本文件是 Wisp 主题外观的唯一规范。改主题样式、写组件、给站点做覆盖之前先读它。
> 颜色值的事实来源仍是 `design/palette.json`（经 `pnpm tokens` 生成 `--wisp-*` 令牌）；本文件的 frontmatter 是它的镜像，两者不一致时以 palette.json 为准并更新本文件。
> 产品层面的事实（读者、定位、约束）见仓库根目录 `PRODUCT.md`。

## Overview

**北极星：一本装订好的技术参考手册。** 每个系列是手册的一个「部分」，每篇文章是一章。读者靠编号定位：书眉写着「站点 / 系列 · 7 / 23 篇」，章首有大号章节号，正文的每个 h2 带编号并与右侧目录一一对应，左侧系列栏是带编号的篇目表，首页是整本手册的总目录（带点线引导和阅读时长，就像页码）。

框架属于手册，正文栏保持安静：42rem 的阅读栏、真实对比度、1.8 的中文行高，正文里不出现装饰。手册感只来自编号、发丝线、三线表、代码清单的题注行和书眉——没有卡片阴影、没有渐变、没有胶囊标签、没有彩色竖条。

拒绝的东西：通用 Tailwind 博客的圆角卡片网格、毛玻璃顶栏、首屏 hero 大图、眉题（eyebrow）、emoji 或 Unicode 字符当图标、终端/黑客风。

**关键特征**

- 编号是导航：章节号、§ 编号、篇目编号同源，屏幕上任何两处编号都能对上。
- 发丝线分层：1px `rule` 分隔同级内容，1px `ink` 线（或 2px）收住一个完整单元（表格、修订记录、区块标题、章末）。
- 一个强调色：teal 只用于「你在这里」和「可以点」——当前项编号、链接、主按钮、阅读进度。
- 中文排版是一等公民：禁止负字距、中文强调用着重号、`text-autospace` 自动中西文间距。

## Colors

整站是**克制型**配色：冷调纸白 + 墨色 + 一个 teal 强调色。8 色分类色（hue）与 ML 语义色只出现在图表、代码和讲解组件里，不进入页面框架。

### Primary

- **手册 teal**（`accent` #0f766e / dark #4fd1c0）：当前位置（书眉里的「7 / 23 篇」、当前篇编号、当前目录项、h2 编号）、正文链接、主按钮底色、阅读进度线、焦点环。一屏里 teal 的面积不超过 5%。

### Neutral

- **纸白**（`paper` #fcfcfb / dark #111214）：页面底色，也是讲解组件的舞台底色。
- **墨色**（`ink` #1d1d1f / dark #e6e6e3）：正文、标题，以及「收口线」（表格顶底线、章末线、区块标题上方的粗线）。
- **灰**（`muted` #5c6067）：元信息、说明、表头、目录未选中项；对 paper ≥ 4.5:1。
- **淡灰**（`subtle` #8b9098）：只用于非文本：点线引导、行号、列表符号、书眉里的「/」「·」分隔符。编号列（首页目录、归档、系列栏、目录）是读者找位置用的文字，用 `muted`。对比度不满足正文 AA，**不能用于需要阅读的文字**。
- **发丝线**（`rule` #e2e2dd）：所有 1px 分隔线和描边。
- **浅底**（`surface` #f4f4f2 / `surface-2`）：要点块（blockquote）、行内代码、讲解组件说明区。
- **代码底**（`code-bg` #f6f6f4）：代码清单底色。

### Categorical inks（图表与讲解的 8 个 hue）

8 个 hue 按**印刷油墨**调，而不是屏幕原色：在 OKLCH 里描边 L≈0.37–0.51、彩度 ≤ 0.11（暗色 L≈0.70–0.85、彩度 ≤ 0.10），填充是接近纸色的淡洗（L≈0.95、彩度 ≈0.02；暗色 L≈0.26）。放在墨色正文和 teal 旁边，它们读起来是几种有色墨水，而不是一组荧光色块。

| hue（语义）            | 墨色         | stroke light / dark | fill light / dark |
| ---------------------- | ------------ | ------------------- | ----------------- |
| blue（q、active）      | 钢蓝         | #2f5783 / #a9cbef   | #e9f2fb / #1a2634 |
| amber（k、highlight）  | 赭石         | #7b5518 / #f2c681   | #fbf2df / #2e2515 |
| green（v、done）       | 苔绿         | #2c522d / #84b585   | #e9f5e9 / #1a281c |
| rose（grad、error）    | 砖红         | #984646 / #eda9aa   | #fcedec / #341f1f |
| violet（weight）       | 茄紫         | #4d335c / #bb9ece   | #f5eef9 / #291e2e |
| teal（activation）     | 手册 teal    | #0f766e / #7fd3c5   | #e3f5f3 / #112926 |
| orange（bias）         | 铁锈         | #762f06 / #ce8d66   | #fceee4 / #311f15 |
| slate（mask、visited） | 冷灰（中性） | #464e57 / #9da7b3   | #eaedf2 / #23272b |

- light 的 teal 就是 `accent`，activation 和界面强调色是同一种墨；dark 的 teal 用比 `accent` 安静一档的 #7fd3c5，作为分类色时不比其他七个更跳。
- 每个 stroke 对 `paper` 和对自己的 fill 都 ≥ 4.5:1（`pnpm contrast` 检查），所以可以用于 1px 线和小字。
- 容易混的两两（blue/violet、green/teal、amber/orange、teal/slate）靠明度拉开，色觉缺陷（红绿、蓝黄）模拟下仍可分辨；各 hue 的明度顺序在两个主题里大体一致，没有哪个颜色单独发亮。

### Named Rules

**一个强调色规则。** teal 是唯一的界面强调色。不要为了区分状态引入第二个界面色；状态用记号表达（编号变色、加粗、1px 竖线），不用色块。

**语义色只属于内容。** `--wisp-sem-*`（Q 蓝、K 琥珀、V 绿、weight 紫、activation teal、grad 砖红、bias 铁锈橙、mask 灰……）在全站所有文章、图表、讲解组件中保持同一含义；页面框架不得借用它们做装饰。

**印刷油墨规则。** 分类色是低彩度的墨，不是屏幕原色：新增或覆盖 hue 时保持 OKLCH 彩度 ≤ 0.11、填充是淡洗，不引入 Tailwind 色阶那样的饱和蓝紫。

**一张图最多 3 种 hue。** 图表默认是中性的（`surface` 底、`muted`/`fg` 1px 线、`fg` 文字），颜色只给这张图要讲的语义角色；`slate` 是中性灰，不计。不要用颜色区分并列的兄弟节点，强调用加粗描边或 `highlight`，不再引入新颜色；节点里的字用 `fg`。图中矩形圆角也是 4px（draw.io `rounded=1;absoluteArcSize=1;arcSize=8`，Excalidraw `roundness.value: 4`）。

**令牌规则。** 颜色只能来自 `--wisp-*` / `--wd-*` 令牌或讲解组件的 `Tone`。禁止十六进制硬编码、Tailwind 原始色阶和 `dark:` 颜色变体。混色用 `color-mix()` 基于令牌。

## Typography

**正文与标题：** Inter Variable（西文、数字）+ Noto Sans SC Variable（汉字、全角标点），系统中文字体作回落。
**代码：** JetBrains Mono Variable，关闭编程连字（读者要看到真实字符）。
**手绘图：** Excalifont，仅在含手绘图的文章加载。

全部自托管（Astro Fonts API + Fontsource），`font-display: swap`；只预加载 Inter 拉丁分片，中文按 unicode-range 分片按需下载。Inter 统一开启 `"cv11", "ss01"`。

### Hierarchy

| 角色           | 规格                                                   | 用途                                                                                                                                                                             |
| -------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| home-title     | clamp(2.5→4rem) / 700 / 1.1                            | 首页扉页站点名，全站唯一的大字                                                                                                                                                   |
| chapter-number | 1.5em of h1 / 300 / teal / tabular                     | 章首的章节号（标题以「05 」开头时自动拆出）                                                                                                                                      |
| chapter-title  | clamp(1.75→2.25rem) / 700 / 1.3 / `text-wrap: balance` | 文章标题；中文标题构建期用 `Intl.Segmenter` 在词间插 `<wbr>` 并 `word-break: keep-all`，只在词边界换行                                                                           |
| h2             | 1.5rem / 700 / 1.3，上方 2.5em 留白，**不画分隔线**    | 章节；CSS 计数器编号 0.8em / 400 / teal / tabular，与标题第一行同基线。≥80rem 悬挂在栏间距里、右对齐到正文左边线外 0.75rem；更窄时在标题前的编号列里，换行后续行悬挂对齐标题起点 |
| h3             | 1.1875rem / 600                                        | 小节；编号形如 2.1，0.8em / muted / tabular，悬挂与对齐方式同 h2（≥80rem 时 h2、h3 标题都从正文左边线开始）                                                                      |
| h4             | 1rem / 600 / muted                                     | 段落小标题，不编号                                                                                                                                                               |
| body           | 1rem（移动 16px，≥768px 17px）/ 400 / 1.8              | 正文，行宽 42rem（≥768px 时 714px，约 42 个汉字；技术文章要给代码、公式和图留宽度，所以取中文舒适区间的上沿）                                                                    |
| section-title  | 1.25rem / 700                                          | 首页区块标题、归档年份                                                                                                                                                           |
| lead           | 1.125rem / 1.7                                         | 首页描述                                                                                                                                                                         |
| ui-large       | 0.9375rem                                              | 按钮、首页篇目、修订记录                                                                                                                                                         |
| ui             | 0.875rem                                               | 导航、书眉、侧栏标题、题注                                                                                                                                                       |
| ui-small       | 0.8125rem / 1.5                                        | 侧栏条目、元信息、表头、时间                                                                                                                                                     |
| label          | 0.75rem                                                | 编号列、语言名                                                                                                                                                                   |
| code           | 0.8125rem / 1.7                                        | 代码清单                                                                                                                                                                         |

### Named Rules

**禁止负字距。** Inter 的紧凑预设会把汉字挤坏；正文 `letter-spacing: 0`，标题最多 `0.01em`。

**中文没有斜体。** `em:lang(zh)` 改为着重号（`text-emphasis: dot; position: under right`）；西文段落以及中文段落里纯西文的 `em`/`i`（由 `rehype-a11y` 自动标 `lang="en"`）保持真斜体。

**数字都是表格数字。** 编号、日期、阅读时长、计数、表格一律 `font-variant-numeric: tabular-nums`，让编号列竖直对齐。

**现代中文排版（渐进增强）。** `text-autospace: normal`、`text-spacing-trim: trim-start`、`line-break: strict`、`overflow-wrap: anywhere`、`hanging-punctuation: first allow-end`；正文段落和列表项 `text-wrap: pretty`（段末不留单个字或「：」「。」落单成行）、标题 `balance`/`pretty`。作者不需要手动在中英文之间加空格。

**等宽字体只给代码和数据。** 不要用 mono 当「技术感」装饰：编号、标签、导航都用正文字体。

## Layout

| 区域               | 规格                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 外框 `.wisp-shell` | `measure`(42rem) + 2×`side`(14rem) + 2×`gutter`(4rem)，页眉、页脚、文章网格、首页共用，左右边线全站对齐                                                                                                                |
| 页面边距           | 移动 20px，≥768px 32px                                                                                                                                                                                                 |
| 页眉               | 高 56px（`--wisp-header-h`），吸顶，实色底 + 底部 1px rule                                                                                                                                                             |
| 文章页 ≥60rem      | 正文 + 右侧目录两栏；属于系列时，系列 `<details>` 占正文列第一行（标题前），目录跨两行吸顶                                                                                                                             |
| 文章页 ≥80rem      | 系列 \| 正文 \| 目录三栏（栏宽固定，展开 / 收起系列栏不移动正文）；系列栏默认收起，只留一行与目录标题行成对的按钮；h2 编号悬挂在正文左侧的栏间距里                                                                     |
| 文章页 <60rem      | 单栏；系列和目录各是一个 `<details>`，分别在标题前和标题后                                                                                                                                                             |
| 侧栏               | 吸顶（header-h + 2rem）。标题行固定在栏顶，只有下面的篇目独立滚动；两栏外边线贴外框左右边线。侧栏隐藏滚动条轨道，仅靠上下缘的渐隐遮罩表达还有内容可滚。系列栏篇目出现时（打开文章、展开）自动把当前篇滚到栏高约 1/3 处 |
| 代码清单           | ≥768px 时向两侧各伸出 1rem                                                                                                                                                                                             |
| 宽内容             | `.wisp-wide`：`min(100vw - 40px, 64rem)`                                                                                                                                                                               |
| 首页目录           | 每个系列一行：左列部分标题（≥60rem 时吸顶），右列篇目（≥80rem 时分两栏）                                                                                                                                               |
| 区块间距           | 首页区块 5rem；正文 h2 上方 2.5em、下方 0.75em（上大下小）；正文里的块（代码、表格、公式、图、要点块、讲解组件）与前后段落统一 1.75em（`--wisp-block-gap`，按正文字号算，约 30px）                                     |

**滚动条**：全站分四层统一治理，滑块采用半透明前景色（`color-mix(in srgb, var(--wisp-fg) 26%, transparent)`，悬停 `46%`），在纸白、代码底、着色块与灯箱上都能自然压暗或提亮，轨道透明、999px 圆角、无步进三角箭头（▲/▼/◄/►）：① 页面主滚动条（`html`）：桌面端 10px 命中区 + 2px 透明内衬 = 6px 悬浮圆角滑块（按住加宽到 8px），消除 Windows 原生悬空三角箭头；② 导航轨道（侧栏 `[data-rail-scroll]`、页眉 `.wisp-nav ul`）：隐藏滚动条轨道，仅靠边缘 `mask-image` 渐隐提示可滚；③ 全部内部滚动容器（`:where(body *)` 零特异性覆盖代码、表格、公式、Mermaid、讲解舞台、Lightbox、文首折叠系列与目录列表、长注释预览 `.wisp-cite-pop` 及任意自定义滚动区）：桌面端 8px 命中区 + 2px 透明内衬 = 4px 悬浮圆角滑块，平时通过 `--wisp-sb: transparent` 完全隐身，指针移入、焦点进入或鼠标拖拽时切换自定义属性立即重绘显现（指向滑块本体时展宽至 6px）；④ Firefox 与触屏设备回退标准 `scrollbar-width` / `scrollbar-color`。所有内部滚动容器均带 `overscroll-behavior` 阻断滚动穿透与触控板误触浏览器前进/后退；非代码的超宽容器与灯箱大图支持鼠标按住 1D/2D 拖拽平移。横向可滚动的代码、表格、公式、图表、讲解舞台仅在确实溢出时成为 Tab 停靠点并附「…，可横向滚动」名称（随窗宽增删，不叠加）；无 JS 时以标记里的 `tabindex=0 data-wisp-tab` 作回落。

间距以 4px 为单位：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80 / 96。断点用 Tailwind 默认（sm 640 / md 768 / lg 1024 / xl 1280）加上布局专用的 60rem / 80rem。

## Elevation & Depth

**没有阴影，没有例外。** 层级只靠字号、字重、留白和线。横向溢出提示也不用阴影：可滚动容器（代码、表格、公式、Mermaid、讲解舞台）哪一侧还有没显示的内容，内容就在那一侧 1.5rem 内渐隐到容器底色（`mask-image`，与底色无关）；滚到头时那一侧的渐隐消失，不溢出的容器不画。键盘聚焦时去掉渐隐，让焦点环完整。

### Named Rules

**线代替阴影。** 1px `rule` 分隔同级内容；1px `ink` 收住一个完整单元（三线表顶底线、修订记录、章末的上一篇/下一篇）；2px `ink` 只用于首页区块标题上方，像手册的分隔页。描边与阴影不叠加。

**页眉不做毛玻璃。** 实色底 + 发丝线；阅读进度是压在这条线上的 1px teal。

## Shapes

只有两档形状圆角（另有 2px 只给焦点环、999px 只给滚动条滑块）：

- **box 4px**：代码清单、要点块、讲解组件卡片、按钮、图片、浮动按钮、提示块。
- **mark 3px**：行内代码、kbd、`<mark>` 高亮、任务列表复选框、小按钮（复制、播放器控制）。

不用胶囊形（pill），不用圆形按钮，不用 8px 以上的圆角。

## Components

### Buttons

- **主按钮**：teal 底、`accent-fg` 字，高 44px，左右 18px，圆角 4px，0.9375rem/500。hover 上移 1px 并向墨色混 12%，按下回落并缩到 0.98。
- **次按钮**：纸白底、1px rule 描边、墨色字；hover 描边变 muted。
- 每屏最多一个主按钮。图标按钮（主题切换、复制、Lightbox 关闭）是 44×44 的透明方块，4px 圆角，hover 只改颜色；焦点环仍是 2px 圆角。
- **主题切换**：三种偏好三个 Lucide 图标——浅色 `sun`、深色 `moon`、跟随系统 `sun-moon`，显示的是当前偏好（不叠角标）；`aria-label` 写明当前偏好和点击后的偏好。
- **返回顶部**：滚过一屏后淡入的 44×44 浮动按钮（纸白底 + 1px rule 描边、4px 圆角），宽屏右缘对齐外框内容边线，窄屏贴页面边距；页脚进入视口后随页脚上移，永远不盖住页脚内容。

### Running head（书眉，签名组件）

页眉左侧：品牌标记 + 站点名；文章页在其后接 `/ 系列名 · 7 / 23 篇`（篇数计数用 teal、表格数字），当正文 h1 滚出视口后淡入 `· 章节标题`（200ms，IntersectionObserver）。「/」「·」是 subtle 色的排版标点，不读出。品牌名、书眉、导航按基线对齐。系列名链接到总览篇。≥80rem 且有 JS 时「7 / 23 篇」是一个外观不变的按钮（hover 和展开时加 1px 下划线），展开 / 收起左侧系列栏，与栏顶按钮是同一个开关；系列栏吸顶，在页面任何位置点开都在视口内。窄于 60rem 时书眉隐藏，由文首的系列 `<details>` 承担。站点覆盖 Header 时通过 `running` prop 拿到这些数据（有 `href` 和 `position` 时视为系列，输出带 `data-series-toggle` 的按钮）。

### Chapter opener（章首）

章节号（大号细体 teal）+ 标题 + 元信息（日期 · 阅读时长 · 分类，无图标）+ `#标签` 行，下面一条 1px rule。**没有眉题。** 标题不以编号开头时不显示章节号。

### Numbered navigation（系列栏、目录）

两列网格：编号列（等宽数字、muted；hover 时与标题一起变墨色）+ 标题列（换行后悬挂对齐）；无编号篇目（如系列总览）取消空编号列、通栏贴齐左轴。左侧系列栏是离散章节索引，不画通高灰线，篇目与栏顶标题共一条外框左轴，仅在当前篇左外侧悬挂一段 2px teal 短竖标（编号变 teal，标题变墨色并加粗）；右侧目录是页内连续滚动进度轴，保留左侧 1px rule 连续轨道并将当前项激活段加粗为 2px teal。目录编号与正文 h2/h3 的 CSS 计数器同一算法（只在顶层是 h2 时编号）。

**系列栏（≥80rem）默认收起。** 栏里只有一行吸顶的 `<button>`：系列名（0.875rem/600 墨色）+ `7 / 10`（0.75rem muted 表格数字）+ 1.75rem 方块里的 Lucide chevron（朝下 = 收起着，朝上 = 展开着），整行 2.5rem 高，与右侧目录的标题行同字号、同高度、同吸顶位置、同一基线，两栏成对。点开后篇目表在原位出现（150–200ms 透明度 + 下移 0.375rem，减少动效时无动画；不做高度动画），chevron 转 180°。状态是 `html[data-series="open|collapsed"]`，由 Post 的内联脚本在首帧前从 `localStorage` 的 `wisp-series-open` 写入；`aria-expanded` / `aria-controls` 同步，按钮 `title` 是「展开 / 收起系列篇目」。无 JS 时没有 `data-series`：按钮隐藏，静态标题行 + 篇目表完整显示（与目录的 `html:not([data-toc])` 同一规则）。60–80rem 及以下仍是标题前折叠的 `<details>`，summary 与栏顶同一写法：系列名 + `7 / 23` + 右端 chevron。

**目录栏顶**是系列栏顶的镜像：`<button>`「目录」+ 右端同一个 chevron，2.5rem 高，右缘贴外框；收起后仍是这一行（文字不消失），只有篇目隐藏。窄屏折叠目录的 summary 同样是「目录」+ 右端 chevron。有小节的 h2 右端有一个 1.5rem 的小 chevron（朝右 / 朝下），固定在栏右缘、对齐标题第一行。点目录项立即高亮该项；滚到页面底部时高亮最后一节。

**键盘顺序**：系列栏 → 目录栏 → 正文（DOM 顺序如此，位置由网格决定）；目录是进入正文的导航，收起时只占一个 Tab。两个侧栏外层是普通 `div`，地标名只在里面的 `<nav>` 上：目录叫「目录」，系列叫「系列：系列名」。

### Code listing（代码清单）

1px rule 描边、4px 圆角、`code-bg` 底；顶部 2.125rem（触屏 2.75rem）题注行与代码同底，只用一条发丝线分开：左边小写语言名（mono 0.75rem muted），右边「自动换行」按钮（Lucide `wrap-text`，`aria-pressed`，按下时 teal；只在不换行时确实横向溢出的块上出现）和复制按钮（Lucide 图标，成功后变 `sem-done` 并 `aria-live` 播报），两个按钮同尺寸、同 hover。行号用 CSS counter，subtle，不可选中。长代码折叠：底部渐隐 + 「展开」按钮（与题注行同一条件下高 44px：窄于 64rem 或触屏）；在展开的长代码底部点「收起」时，代码块顶端回到页眉下方（遵守 `scroll-padding-top`，减少动态效果时直接跳），焦点留在按钮上。

**换行**：默认长行横向滚动（右侧渐隐提示）；站点可用 `features.codeWrap` 改为默认换行。换行是读者偏好，存在 localStorage 并作用于整页代码块，首帧前生效。换行时每个逻辑行只在第一视觉行有行号，续行悬挂缩进到代码起点再多缩 2ch；diff 行的底色覆盖整个逻辑行。打印时一律换行。

### Tables（三线表）

顶线、底线 1px ink；表头下 1px（ink 45% 混 rule）；行间 1px rule。表头 0.8125rem/600/muted，不加粗正文。单元格左对齐、首列贴边；单元格里的行内代码只在空格处换行、不在记号中间断开（`file.py:234-358` 整体不拆）；长描述单元格（`rehype-a11y` 标记 `data-wisp-prose`）保底阅读宽度，避免被短数字列挤压成细条。表格包在 `div.wisp-table` 里（宽屏两侧轻度外扩 1rem，底部与横向细滑块隔开呼吸间距），确实横向溢出时首列吸左固定（向右滚离左缘后带 1px rule 分隔线），并可键盘聚焦与鼠标按住拖拽平移。

### Note block（要点块）

Markdown 引用块 = 手册里的「要点」：`surface` 浅底 + 1px `rule` 描边（与代码清单同一种收边；暗色里 surface 与纸色太近，只靠底色看不出是一个块）、4px 圆角、正文色、不用斜体、**不画彩色竖条**。

### Figures

**所有图同一套题注语法**（draw.io / Excalidraw、Mermaid、Markdown 图片、`<Figure>`）：`<figure class="wisp-figure …">`，图在上、题注在下（中文排版：图题在下，表题在上）。题注 muted 0.875rem/1.6，**贴正文栏左缘**——图比栏窄时图居中，题注仍与正文左边线对齐。题注以图号开头（`图 05-1：`、`图 3:`、`Figure 2.`、`Fig. 2:`）时图号拆成 `.wisp-fig-no`：墨色、600、表格数字；没写图号就是普通题注，主题不自动编号。

- **题注 + 动作**（图表的「源文件」「draw.io」）：题注独占 100% 栏宽并启用 `text-wrap: pretty`，长短题注都不与工具动作争抢行宽。有悬停能力的宽屏（≥40rem、`hover: hover`、`pointer: fine`）将动作收进图表右上角的浮动小条（纸白实底 + 1px `rule` 描边 + 4px 圆角，无阴影；两项之间用 1px `rule` 竖线分隔，0.75rem muted、hover teal，Lucide 图标 + 短词，完整含义在 `aria-label` / `title`），默认隐藏（`opacity: 0`），鼠标移入图表或键盘聚焦时 150ms 淡入；figure 的可访问名称只取题注文字（`aria-labelledby`）。
- **只有动作**：桌面端同样悬浮于图表右上角；**只有题注**：只有题注。都没有：图下什么都没有。
- **触屏或窄于 40rem**：动作回退到题注（或图体）下方单独一行、贴左缘，触控高度 ≥ 44px；打印时隐藏动作。
- **Markdown 图片**：`![alt](./x.webp '图 05-3：…')` 这种段落里只有一张、带标题的图片由 `rehype-figure` 排成 figure，title 变成题注并从 img 上去掉（不再有重复的悬停提示）；不带标题的图片保持原样。Astro 的图片优化不受影响。Mermaid 题注写在围栏 meta 里：` ```mermaid caption="图 3：…" `。
- **位图**：figure 里的位图加 1px `rule` 描边定出边缘（两种主题都加；白底截图在浅色页上也有边），不加滤镜、不反色。

图按容器缩放，但不放大超过自然宽度；点击用 Lightbox 看原尺寸：宽屏按视口缩放显示；窄于 40rem 时按自然宽度（最多 2 倍视口宽）放在可平移的区域里，打开时滚到中间，关闭按钮固定在右上角。**图上和题注旁不加缩放比例之类的标记**：图应该按正文栏宽度来画（自然宽度 640–700px），而不是画宽了再提示读者放大。draw.io 标签里的公式（`math="1"`）按行内排版。Mermaid 最小缩放 75%，放不下在图内横向滚动。

### Explainer（交互讲解）

手册里的一幅插图，不是媒体播放器。整张卡片只有一圈 1px rule、4px 圆角、纸白底，从上到下：

- **标题行**（可选）：左边标题，开头的图号（`图 05-2a：`、`Figure 2:`）与静态图题同一语法——图号 `.wisp-fig-no` 墨色 600 tabular，其余 muted 常规；右边步数「3 / 10」muted tabular，按最宽的「10 / 10」预留宽度。下方一条发丝线。没有标题时不画这一行，步数并到控制条右侧倍速键前。
- **舞台**：纸白底，SVG 画面。舞台有 min-height 棘轮：同一宽度下只增不减，宽度变化时重新计，不做动画。
- **进度刻度线**：舞台与说明的分界就是这条 1px rule；已走过的部分是 2px teal（与页眉阅读进度线同一语言），≤ 24 步时每步一个 1×7px 刻度（已到达的变 teal），更多时只有连续的线。控件是透明的 `<input type="range">`，命中区 24px 高；方形滑块（12px、3px 圆角、纸白描边）只在 hover / 键盘焦点时出现，焦点环 2px teal。
- **说明**：`surface` 底，墨色 0.9375rem / 1.6（窄屏 0.875rem），左对齐；支持 `$…$` 行内公式（KaTeX）。说明区高度 = 当前宽度下最长那一步的高度：全部步骤的说明叠在同一网格格子里，只有当前那段可见并在 `aria-live` 区里，所以翻页、播放、改窗宽时卡片都不跳。
- **控制条**：同一 `surface` 上的一行，320px 也不换行。左边 上一步 / 播放 / 下一步：只有播放键是 teal 实心，上一步 / 下一步是无边框的幽灵按钮（hover `surface-2`，3px 圆角，禁用时 `subtle`）；播到最后一步播放键换成 Lucide rotate-ccw（「重新播放」）。右边一个倍速键，按一下在 0.5× → 1× → 2× 之间循环，数字 tabular、按最宽值预留宽度。按钮 40×40（`pointer: coarse` 44×44）。没有「第一步 / 最后一步」按钮，Home / End 键仍然可用；按钮的 title 带键位提示（← → 空格）。
- **动效**：只有 150ms 的颜色 / 背景过渡；播放 / 暂停换图标不改变按钮尺寸；`prefers-reduced-motion` 下全部关闭。
- **SVG 原语**：格子文字是 mono 16px（数据），Label 是 sans 14px / 600，`TexLabel` 用 foreignObject 放 KaTeX（同 14px，必须给宽高）。强高亮描边向格子内收，不会被舞台边界裁掉。

### Citations（引用）

作者语法就是 GFM 脚注（`[^key]`），渲染成手册式的引用：

- **文内标记**：真上标，teal、500、表格数字，带方括号 `[1]`（GB/T 7714 顺序编码制的写法，也不会和公式上标混淆）；紧挨着的引用合并成 `[1, 2]`。不加下划线（hover 才有）；点击区约 24px 高，但标记行高为 0，有无引用的行行距完全一致；标记不会单独落到行首。
- **跳转**：点击平滑滚动到注释（减少动态效果时直接跳），目标短暂标记约 2 秒——`[n]` 编号变 teal、正文变墨色，然后淡回；不闪底色。回链同理，从正文某处点下时唯一回链动态指向该处，返回后对应标记加 2 秒下划线。无 JS 时是普通锚点，`:target` 给同样的标记，回链默认回首次引用处。
- **预览**：有指针悬停的设备上，悬停或键盘聚焦标记时弹出该条注释（纸白底、1px rule 描边、4px 圆角、无阴影、最宽 22rem、0.8125rem，链接可点）；Esc、失焦、滚动时关闭；触屏不弹出。
- **文末列表**：标题「参考与注释」/「References」（0.875rem / 600 / 墨色，不参与 h2 编号、不进目录），上方一条 1px rule 与正文分开——章末的 1px ink 收口线仍由下面的上一篇/下一篇负责，不画两条墨线。列表去掉左侧悬空竖轨，采用与文内呼应的 `[n]` 方括号编号列（与标题左对齐，muted 表格数字）+ 悬挂对齐的 0.875rem muted 正文，注文内 `code` 继承柔和字色与 `code-bg` 底色；长 URL 在栏内断行。每条末尾只保留唯一一枚返回正文的 Lucide `arrow-up`（subtle，hover teal），多处引用时不堆砌序号尾巴。

### Prev / Next（章末）

一条 1px ink 线收住全文，下面左右两格：小号 muted 标签（带箭头图标）+ 墨色标题；hover 标签和标题变 teal、箭头外移 3px。不是卡片。

### Home（扉页 + 总目录）

扉页：站点名（home-title）、描述、版本说明行（「2 个系列 · 33 篇 · 更新于 …」）、主按钮「从「系列」开始读」+ 次按钮。然后：**目录**（每个系列一个部分：teal 部分号 + 系列名、副题、简介、篇数与日期；右侧完整篇目：编号 · 标题 · 点线引导 · 阅读时长；编号列 muted 表格数字，标题换行时悬挂对齐，点线从标题最后一行末尾引到时长、时长与最后一行同基线，像印刷目录的页码）→ **其他文章**（不属于系列的文章）→ **修订记录**（日期 | 标题 | 所属系列的三线列表）。触屏（`pointer: coarse`）时篇目行和修订记录行的链接命中高度 ≥44px（加大内边距或把命中区铺满整行），字号和行距不变。首页扉页文字入场一次（520ms 上浮，逐行 60ms），其他地方不做入场动画。

### Archive / Tags

归档：每年一张三线列表（月-日 | 编号 | 标题 | 所属系列）。系列篇标题里的「05 」拆成编号列（muted 表格数字，与首页目录同宽），只要有一篇带编号，所有行都留出编号列，标题左缘对齐。标签 / 分类索引：`#标签名` 文字链接 + 计数（muted 表格数字），hover teal，不用胶囊底。标签、分类、分页列表页的页头与 Page 布局同一规格（标题 + 说明，下方 1px rule），文章之间 1px rule。触屏时整行链接（归档行）≥44px、分页链接 ≥44px、行内标签链接 ≥32px 且间距 ≥8px。

### Icons

只用 Lucide（构建期内联 SVG，`Icon.astro`；React 里用 `PlayerIcon.tsx` 这样的内联路径），描边 2、尺寸 1em、颜色 currentColor。**禁止用 emoji 或 Unicode 字符（▶ ⏮ ✓ ← 等）当图标。**

## Do's and Don'ts

### Do:

- **Do** 让每个编号都能对上：章节号、§ 编号、目录编号、系列编号来自同一数据。
- **Do** 用线和留白分层：同级 1px rule，收口 1px ink，区块 2px ink。
- **Do** 所有数字用 `tabular-nums`；编号列固定宽度并让标题悬挂对齐。
- **Do** 主题内部互相引用组件走 `virtual:wisp/components/<Name>`，样式放进正确的 `@layer`（框架 → components，正文内容 → utilities）。
- **Do** 浏览器自带的表面也要设计：选区色、焦点环（2px teal，offset 2px）、滚动条、下划线偏移（0.25em）。
- **Do** `prefers-reduced-motion: reduce` 下关闭所有过渡和入场动画。
- **Do** 画图时按正文栏宽度排版（自然宽度 640–700px，流程从上到下走）；横向一字排开的宽图会被缩到看不清。
- **Do** 图里默认用中性节点，只给要讲的语义角色上色（一张图 ≤ 3 种 hue，slate 不计）；强调用加粗描边。

### Don't:

- **Don't** 用卡片 + 阴影做列表；不要嵌套卡片；不要用 hover 上浮的卡片做导航。
- **Don't** 在标题上方放眉题（eyebrow / kicker）。
- **Don't** 给引用块、提示块、列表项加 2px 以上的彩色竖条。
- **Don't** 用毛玻璃、渐变、渐变文字、发光描边。
- **Don't** 用 emoji 或 Unicode 字符当图标。
- **Don't** 使用负字距，或给中文 `em` 用斜体。
- **Don't** 让等宽字体出现在正文、标题或导航里。
- **Don't** 在页面框架里使用 hue / 语义色；也不要在 teal 之外引入第二个界面强调色。
- **Don't** 圆角超过 4px，或使用胶囊形（图表节点也一样）。
- **Don't** 在一张图里用颜色区分兄弟节点，或把节点文字染成描边色；不要引入调色板之外的饱和蓝紫。
