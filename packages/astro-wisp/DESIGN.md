---
name: Wisp
description: 中文优先的技术博客主题，按一本装订好的技术参考手册来排：书眉、章节号、编号目录、三线表、代码清单。
colors:
  paper: "#fcfcfb"
  paper-dark: "#111214"
  surface: "#f4f4f2"
  surface-dark: "#18191c"
  surface-2: "#ebebe7"
  surface-2-dark: "#202125"
  rule: "#e2e2dd"
  rule-dark: "#2b2d31"
  ink: "#1d1d1f"
  ink-dark: "#e6e6e3"
  muted: "#5c6067"
  muted-dark: "#a0a4ab"
  subtle: "#8b9098"
  subtle-dark: "#6b7078"
  accent: "#0f766e"
  accent-dark: "#4fd1c0"
  accent-fg: "#ffffff"
  accent-fg-dark: "#0b1f1d"
  code-bg: "#f6f6f4"
  code-bg-dark: "#16171a"
  selection: "#ccf0ea"
  selection-dark: "#1d3d39"
typography:
  home-title:
    fontFamily: "Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif"
    fontSize: "clamp(2.5rem, 1.6rem + 3.6vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0em"
  chapter-title:
    fontFamily: "Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif"
    fontSize: "clamp(1.75rem, 1.25rem + 1.8vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0em"
  chapter-number:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "1.5em"
    fontWeight: 300
    lineHeight: 1
  h2:
    fontFamily: "Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  h3:
    fontFamily: "Inter Variable, Noto Sans SC Variable, PingFang SC, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter Variable, Noto Sans SC Variable, PingFang SC, HarmonyOS Sans SC, MiSans, Microsoft YaHei, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "0em"
  section-title:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
  lead:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
  ui-large:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  ui-small:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  prose-h1:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.3
  diagram-label:
    fontFamily: "Inter Variable, Noto Sans SC Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  code:
    fontFamily: "JetBrains Mono Variable, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  focus: "2px"
  mark: "3px"
  box: "4px"
  scrollbar: "999px"
spacing:
  unit: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "80px"
  measure: "42rem"
  side: "14rem"
  gutter: "4rem"
  header: "56px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.box}"
    padding: "0 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.box}"
    padding: "0 18px"
    height: "44px"
  code-listing:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.box}"
  inline-code:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.mark}"
    padding: "0.125em 0.3em"
  note-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.box}"
    padding: "0.125em 1.25em"
  header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "{spacing.header}"
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
- **淡灰**（`subtle` #8b9098）：只用于非文本：编号列、点线引导、行号、列表符号。对比度不满足正文 AA，**不能用于需要阅读的文字**。
- **发丝线**（`rule` #e2e2dd）：所有 1px 分隔线和描边。
- **浅底**（`surface` #f4f4f2 / `surface-2`）：要点块（blockquote）、行内代码、讲解组件说明区。
- **代码底**（`code-bg` #f6f6f4）：代码清单底色。

### Named Rules
**一个强调色规则。** teal 是唯一的界面强调色。不要为了区分状态引入第二个界面色；状态用记号表达（编号变色、加粗、1px 竖线），不用色块。

**语义色只属于内容。** `--wisp-sem-*`（Q 蓝、K 琥珀、V 绿、weight 紫、activation teal、grad 玫红、bias 橙、mask 灰……）在全站所有文章、图表、讲解组件中保持同一含义；页面框架不得借用它们做装饰。

**令牌规则。** 颜色只能来自 `--wisp-*` / `--wd-*` 令牌或讲解组件的 `Tone`。禁止十六进制硬编码、Tailwind 原始色阶和 `dark:` 颜色变体。混色用 `color-mix()` 基于令牌。

## Typography

**正文与标题：** Inter Variable（西文、数字）+ Noto Sans SC Variable（汉字、全角标点），系统中文字体作回落。
**代码：** JetBrains Mono Variable，关闭编程连字（读者要看到真实字符）。
**手绘图：** Excalifont，仅在含手绘图的文章加载。

全部自托管（Astro Fonts API + Fontsource），`font-display: swap`；只预加载 Inter 拉丁分片，中文按 unicode-range 分片按需下载。Inter 统一开启 `"cv11", "ss01"`。

### Hierarchy
| 角色 | 规格 | 用途 |
|---|---|---|
| home-title | clamp(2.5→4rem) / 700 / 1.1 | 首页扉页站点名，全站唯一的大字 |
| chapter-number | 1.5em of h1 / 300 / teal / tabular | 章首的章节号（标题以「05 」开头时自动拆出） |
| chapter-title | clamp(1.75→2.25rem) / 700 / 1.3 / `text-wrap: pretty` | 文章标题 |
| h2 | 1.5rem / 700 / 1.3，上方 2.5em 留白，**不画分隔线** | 章节；带 CSS 计数器编号 |
| h3 | 1.1875rem / 600 | 小节；编号形如 2.1，muted |
| h4 | 1rem / 600 / muted | 段落小标题，不编号 |
| body | 1rem（移动 16px，≥768px 17px）/ 400 / 1.8 | 正文，行宽 42rem（≥768px 时 714px，约 42 个汉字；技术文章要给代码、公式和图留宽度，所以取中文舒适区间的上沿） |
| section-title | 1.25rem / 700 | 首页区块标题、归档年份 |
| lead | 1.125rem / 1.7 | 首页描述 |
| ui-large | 0.9375rem | 按钮、首页篇目、修订记录 |
| ui | 0.875rem | 导航、书眉、侧栏标题、题注 |
| ui-small | 0.8125rem / 1.5 | 侧栏条目、元信息、表头、时间 |
| label | 0.75rem | 编号列、语言名 |
| code | 0.8125rem / 1.7 | 代码清单 |

### Named Rules
**禁止负字距。** Inter 的紧凑预设会把汉字挤坏；正文 `letter-spacing: 0`，标题最多 `0.01em`。

**中文没有斜体。** `em:lang(zh)` 改为着重号（`text-emphasis: dot; position: under right`）；西文段落里的 `em` 保持斜体。

**数字都是表格数字。** 编号、日期、阅读时长、计数、表格一律 `font-variant-numeric: tabular-nums`，让编号列竖直对齐。

**现代中文排版（渐进增强）。** `text-autospace: normal`、`text-spacing-trim: trim-start`、`line-break: strict`、`overflow-wrap: anywhere`、`hanging-punctuation: first allow-end`；`p { text-wrap: pretty }`、标题 `balance`/`pretty`。作者不需要手动在中英文之间加空格。

**等宽字体只给代码和数据。** 不要用 mono 当「技术感」装饰：编号、标签、导航都用正文字体。

## Layout

| 区域 | 规格 |
|---|---|
| 外框 `.wisp-shell` | `measure`(42rem) + 2×`side`(14rem) + 2×`gutter`(4rem)，页眉、页脚、文章网格、首页共用，左右边线全站对齐 |
| 页面边距 | 移动 20px，≥768px 32px |
| 页眉 | 高 56px（`--wisp-header-h`），吸顶，实色底 + 底部 1px rule |
| 文章页 ≥60rem | 正文 + 右侧目录两栏 |
| 文章页 ≥80rem | 系列 \| 正文 \| 目录三栏；h2 编号悬挂在正文左侧的栏间距里 |
| 文章页 <60rem | 单栏；系列和目录各是一个 `<details>`，分别在标题前和标题后 |
| 侧栏 | 吸顶（header-h + 2rem），独立滚动。滚动条平时不画，指针移入或键盘聚焦时才出现细滑块；上下哪一头还有内容，哪一头渐隐。打开文章时系列栏自动滚到当前篇 |
| 代码清单 | ≥768px 时向两侧各伸出 1rem |
| 宽内容 | `.wisp-wide`：`min(100vw - 40px, 64rem)` |
| 首页目录 | 每个系列一行：左列部分标题（≥60rem 时吸顶），右列篇目（≥80rem 时分两栏） |
| 区块间距 | 首页区块 5rem；正文 h2 上方 2.5em、下方 0.75em（上大下小） |

间距以 4px 为单位：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80 / 96。断点用 Tailwind 默认（sm 640 / md 768 / lg 1024 / xl 1280）加上布局专用的 60rem / 80rem。

## Elevation & Depth

**没有阴影。** 层级只靠字号、字重、留白和线。唯一的例外是横向溢出提示：可滚动容器（代码、表格、公式、讲解舞台）右缘一条内阴影，表示内容没显示完，只在确实溢出时出现。

### Named Rules
**线代替阴影。** 1px `rule` 分隔同级内容；1px `ink` 收住一个完整单元（三线表顶底线、修订记录、章末的上一篇/下一篇）；2px `ink` 只用于首页区块标题上方，像手册的分隔页。描边与阴影不叠加。

**页眉不做毛玻璃。** 实色底 + 发丝线；阅读进度是压在这条线上的 1px teal。

## Shapes

只有两档形状圆角（另有 2px 只给焦点环、999px 只给滚动条滑块）：
- **box 4px**：代码清单、要点块、讲解组件卡片、按钮、图片、浮动按钮、提示块。
- **mark 3px**：行内代码、kbd、小按钮（复制、播放器控制）。

不用胶囊形（pill），不用圆形按钮，不用 8px 以上的圆角。

## Components

### Buttons
- **主按钮**：teal 底、`accent-fg` 字，高 44px，左右 18px，圆角 4px，0.9375rem/500。hover 上移 1px 并向墨色混 12%，按下回落并缩到 0.98。
- **次按钮**：纸白底、1px rule 描边、墨色字；hover 描边变 muted。
- 每屏最多一个主按钮。图标按钮（主题切换、复制、回到顶部）是 44×44 的透明方块，hover 只改颜色。

### Running head（书眉，签名组件）
页眉左侧：品牌标记 + 站点名；文章页在其后接 `/ 系列名 · 7 / 23 篇`（篇数计数用 teal、表格数字），当正文 h1 滚出视口后淡入章节标题（200ms，IntersectionObserver）。窄于 60rem 时书眉隐藏，由文首的系列 `<details>` 承担。站点覆盖 Header 时通过 `running` prop 拿到这些数据。

### Chapter opener（章首）
章节号（大号细体 teal）+ 标题 + 元信息（日期 · 阅读时长 · 分类，无图标）+ `#标签` 行，下面一条 1px rule。**没有眉题。** 标题不以编号开头时不显示章节号。

### Numbered navigation（系列栏、目录）
两列网格：编号列（等宽数字、subtle）+ 标题列（换行后悬挂对齐）。左侧 1px rule 轨道；当前项那一段轨道换成 1px teal，编号变 teal，标题变墨色并加粗。目录编号与正文 h2/h3 的 CSS 计数器同一算法（只在顶层是 h2 时编号）。

### Code listing（代码清单）
1px rule 描边、4px 圆角、`code-bg` 底；顶部 2.125rem（触屏 2.75rem）题注行与代码同底，只用一条发丝线分开：左边小写语言名（mono 0.75rem muted），右边复制按钮（Lucide 图标，成功后变 `sem-done` 并 `aria-live` 播报）。行号用 CSS counter，subtle，不可选中。长代码折叠：底部渐隐 + 「展开」按钮。

### Tables（三线表）
顶线、底线 1px ink；表头下 1px（ink 45% 混 rule）；行间 1px rule。表头 0.8125rem/600/muted，不加粗正文。单元格左对齐、首列贴边，行内代码不拆行；表格包在可聚焦的 `div.wisp-table` 里，过宽时横向滚动。

### Note block（要点块）
Markdown 引用块 = 手册里的「要点」：`surface` 浅底、4px 圆角、正文色、不用斜体、**不画彩色竖条**。

### Figures
图表 `<figure>`：图下左对齐题注（muted 0.875rem，形如「图 05-1：…」），题注下一行是小号「下载源文件 / 打开 draw.io」。图按容器缩放，但不放大超过自然宽度；点击用 Lightbox 看原尺寸。**图上和题注旁不加缩放比例之类的标记**：图应该按正文栏宽度来画（自然宽度 640–700px），而不是画宽了再提示读者放大。draw.io 标签里的公式（`math="1"`）按行内排版。Mermaid 最小缩放 75%，放不下在图内横向滚动。

### Explainer（交互讲解）
一张 4px 圆角卡片：顶部标题行（纸白底 + 发丝线）、纸白舞台、`surface` 说明区和控制条。控制按钮 40×40、3px 圆角、Lucide 图标（skip-back / chevron-left / play·pause / chevron-right / skip-forward）；播放键 teal 底；倍速是按下态切换。

### Prev / Next（章末）
一条 1px ink 线收住全文，下面左右两格：小号 muted 标签（带箭头图标）+ 墨色标题；hover 标签和标题变 teal、箭头外移 3px。不是卡片。

### Home（扉页 + 总目录）
扉页：站点名（home-title）、描述、版本说明行（「2 个系列 · 33 篇 · 更新于 …」）、主按钮「从「系列」开始读」+ 次按钮。然后：**目录**（每个系列一个部分：teal 部分号 + 系列名、副题、简介、篇数与日期；右侧完整篇目：编号 · 标题 · 点线引导 · 阅读时长）→ **其他文章**（不属于系列的文章）→ **修订记录**（日期 | 标题 | 所属系列的三线列表）。首页扉页文字入场一次（520ms 上浮，逐行 60ms），其他地方不做入场动画。

### Archive / Tags
归档：每年一张三线列表（月-日 | 标题 | 所属系列）。标签：`#标签名` 文字链接 + 计数，muted，hover teal，不用胶囊底。

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

### Don't:
- **Don't** 用卡片 + 阴影做列表；不要嵌套卡片；不要用 hover 上浮的卡片做导航。
- **Don't** 在标题上方放眉题（eyebrow / kicker）。
- **Don't** 给引用块、提示块、列表项加 2px 以上的彩色竖条。
- **Don't** 用毛玻璃、渐变、渐变文字、发光描边。
- **Don't** 用 emoji 或 Unicode 字符当图标。
- **Don't** 使用负字距，或给中文 `em` 用斜体。
- **Don't** 让等宽字体出现在正文、标题或导航里。
- **Don't** 在页面框架里使用 hue / 语义色；也不要在 teal 之外引入第二个界面强调色。
- **Don't** 圆角超过 4px，或使用胶囊形。
