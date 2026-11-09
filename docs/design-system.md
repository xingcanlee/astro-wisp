# Wisp 设计系统

关键词：**安静、好读、克制**。大留白，层级只靠字号、字重和间距来区分，不用装饰性的阴影和渐变。整站只有一个强调色（teal），其余色彩只在图表和代码中出现。

## 1. 令牌体系

主题的默认调色板 `packages/astro-wisp/design/palette.json` 是唯一来源，由 `pnpm tokens` 生成主题包内的 `src/styles/tokens.css`（生成文件，禁止手改）。站点用 `wisp({ palette })` 覆盖时，集成在构建期用同一套函数生成令牌。

### 1.1 CSS 变量命名

| 前缀 | 用途 | 示例 |
|---|---|---|
| `--wisp-*` | 基础色 | `--wisp-bg` `--wisp-fg` `--wisp-muted` `--wisp-accent` `--wisp-border` `--wisp-code-bg` |
| `--wisp-hue-<name>` / `--wisp-hue-<name>-fill` | 8 色分类色（stroke / fill） | `--wisp-hue-blue` `--wisp-hue-blue-fill` |
| `--wisp-sem-<name>` / `--wisp-sem-<name>-fill` | 语义色，是对 hue 的引用 | `--wisp-sem-q: var(--wisp-hue-blue)` |
| `--wisp-font-*` | 字体栈 | `--wisp-font-sans` `--wisp-font-mono` `--wisp-font-hand` |

生成结构：

```css
:root, [data-theme="light"] { color-scheme: light; --wisp-bg: #fcfcfb; ... }
[data-theme="dark"]         { color-scheme: dark;  --wisp-bg: #111214; ... }
/* 语义色只写一次，自动随 hue 切换 */
:root { --wisp-sem-q: var(--wisp-hue-blue); --wisp-sem-q-fill: var(--wisp-hue-blue-fill); ... }
```

`data-theme` 始终由 head 中的内联脚本写入一个确定值（light/dark）。"跟随系统"由脚本解析为具体值，CSS 不需要 media query 分支。

### 1.2 Tailwind v4 接入

```css
@import "tailwindcss";
@import "./tokens.css";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme inline {
  --color-bg: var(--wisp-bg);
  --color-fg: var(--wisp-fg);
  --color-muted: var(--wisp-muted);
  --color-accent: var(--wisp-accent);
  --color-border: var(--wisp-border);
  --color-surface: var(--wisp-surface);
  --font-sans: var(--wisp-font-sans);
  --font-mono: var(--wisp-font-mono);
}
```

组件里只写 `bg-bg text-fg border-border` 这类语义类名。**禁止**使用 `text-gray-500` 这类原始色阶，也禁止写 `dark:` 颜色变体，颜色由令牌自动切换。

### 1.3 第三方样式的映射

| 对象 | 映射方式 |
|---|---|
| Shiki | 双主题 + `defaultColor: false`，`[data-theme=dark] .shiki { color: var(--shiki-dark); background: var(--wisp-code-bg) }`，背景统一使用 `--wisp-code-bg` |
| KaTeX | 继承 `currentColor`，只调整字号（1.05em）和块级公式的外边距 |
| Pele | `.pele { --pele-bg: transparent; --pele-fg: var(--wisp-fg); --pele-muted: var(--wisp-muted); --pele-line: var(--wisp-muted); --pele-surface: var(--wisp-surface); --pele-surface-alt: var(--wisp-surface-2); --pele-border: var(--wisp-border); --pele-accent: var(--wisp-accent); --pele-font: var(--wisp-font-sans); --pele-radius: 8px; --pele-series-1..8: hue 顺序 }` |
| 图表 SVG | 见 [diagrams.md](./diagrams.md) §3 |

Shiki 主题首选 `github-light` / `github-dark`。注释颜色必须在 `--wisp-code-bg` 上达到 4.5:1，不达标时用 transformer 或 CSS 覆盖 `.token-comment`。

## 2. 中文排版（现代化）

### 2.1 字体

| 角色 | 字体 | 来源 |
|---|---|---|
| 西文 / 数字 | Inter Variable | `@fontsource-variable/inter`，经 Astro Fonts API 注册（`--font-wisp-sans`） |
| 中文 | Noto Sans SC Variable（思源黑体） | `@fontsource-variable/noto-sans-sc`，已按 unicode-range 切成约 100 个分片，浏览器只下载用到的分片 |
| 代码 | JetBrains Mono Variable | `@fontsource-variable/jetbrains-mono`，经 Astro Fonts API 注册（`--font-wisp-mono`） |
| 手绘图 | Excalifont | 随主题分发，经 Fonts API local provider 注册（`--font-wisp-hand`），只在含手绘图的文章加载 |

- 字体栈先列 Inter 再列 Noto SC：西文字符由 Inter 渲染，汉字回落到 Noto SC。中文标点由 Noto SC 渲染，因为 Inter 不包含全角标点。
- 一律 `font-display: swap`。只对首屏用到的 Inter 拉丁分片做 `preload`；**不 preload 中文分片**，数量太多，交给 unicode-range 按需下载。
- 系统字体（PingFang、HarmonyOS Sans、MiSans、雅黑）作为加载前和加载失败时的回落，保证首屏观感接近。
- 全部字体为 SIL Open Font License 1.1，构建期复制进站点产物（自托管），页面不请求任何第三方字体服务。
- Inter 启用 `font-feature-settings: "cv11", "ss01"`（单层 a、开口数字），视觉上更柔和。可以视情况调整，但必须全站统一。

### 2.2 排版规则

| 项 | 值 | 说明 |
|---|---|---|
| 根字号 | 移动端 16px，≥ 768px 时 17px | |
| 正文行高 | 1.8 | 中文需要比西文更松的行高 |
| 标题行高 | 1.35 | |
| 行宽 | 正文容器 `max-width: var(--wisp-measure)`（38rem） | 约每行 36–38 个汉字 |
| 段间距 | `1em`，不做首行缩进 | 屏幕阅读习惯 |
| 字距 | 正文 `letter-spacing: 0`；标题可用 `0.01em` | **禁止负字距**，Inter 的 tight 预设会把汉字挤坏 |
| 标题层级 | 文章 h1 `clamp(1.75rem, …, 2.375rem)`/700；h2 1.625rem/700；h3 1.1875rem/600；h4 1rem/600（muted） | h2 是章节：上方 1px 分隔线 + 2.25em 留白（正文第一个 h2、紧跟 `<hr>` 的 h2 不画线）；h3 只靠字号和留白 |
| 强调 | `strong` 600；`em:lang(zh)` 不用斜体（中文没有真斜体），改为 `font-style: normal; text-emphasis: dot; text-emphasis-position: under right` | 西文段落里的 `em` 保持斜体 |
| 链接 | `--wisp-accent` 色，下划线 `text-underline-offset: 0.25em; text-decoration-thickness: 1px`，hover 时加粗到 2px | |
| 行内代码 | 0.875em，背景 `--wisp-surface`，左右 padding 0.3em，圆角 4px | |
| 引用块 | 左边框 3px（accent 与 border 混色）+ `--wisp-surface` 浅底，正文色，不用斜体 | 与正文里的加粗区分开 | |

### 2.3 现代 CSS 特性（渐进增强）

```css
html:lang(zh) body {
  text-autospace: normal;          /* 中西文之间自动加间距，不需要手动加空格 */
  text-spacing-trim: trim-start;   /* 行首标点挤压 */
  line-break: strict;              /* 避头尾 */
  word-break: normal;
  overflow-wrap: anywhere;         /* 防止长 URL 撑破布局 */
  hanging-punctuation: first allow-end;
}
.prose p { text-wrap: pretty; }
.prose :is(h1,h2,h3,h4) { text-wrap: balance; }
```

不支持这些属性的浏览器会自然回落，不需要 polyfill。作者写作时**不要求**手动在中英文之间加空格（加了也不会出问题）。

### 2.4 `lang` 属性

`<html lang="zh-CN">`。文章 frontmatter 可以用 `lang` 覆盖，用于英文文章。`lang` 决定 Noto SC 使用的字形，以及上面 `:lang(zh)` 规则是否生效。

## 3. 布局

| 区域 | 规格 |
|---|---|
| 页面外边距 | 移动端 20px，平板 32px，桌面自动居中 |
| 外框 `.wisp-shell` | `--wisp-measure`（38rem）+ 2 × `--wisp-side`（15rem）+ 2 × `--wisp-gutter`（3rem）；页头、页脚、文章网格、首页共用，左右边线全站对齐 |
| 正文容器 | `--wisp-measure`（38rem）；单栏页面用 `.wisp-container`（同宽居中） |
| 宽内容（图表、宽表格、交互组件） | 允许突破到 `min(100vw - 40px, 64rem)`，使用 `.wisp-wide` |
| 文章页侧栏 | ≥ 60rem：正文 + 右侧目录两栏（正文左缘对齐品牌名）；≥ 72rem：系列 \| 正文 \| 目录三栏，两侧栏等宽、各自贴外框边缘；更窄时系列和目录都改为文首的 `<details>`。侧栏吸顶，底部渐隐提示还能滚动；当前项是 accent 竖条 + surface 浅底 |
| 顶栏 | 高 64px，吸顶，半透明底 + 背景模糊（不支持时实色）；左侧品牌标记 + 站点名，右侧导航（悬停画出下划线，当前页 accent 下划线）和主题切换 |
| 页脚 | `--wisp-surface` 底。上半：站点名与描述、系列入口（带篇数）、站点导航；下半：版权与 GitHub / RSS 图标 |

断点直接使用 Tailwind 默认值（sm 640 / md 768 / lg 1024 / xl 1280）。

## 4. 组件外观

- **首页**：首屏左边是站点名、描述和两个按钮，右边是「系列地图」（每个系列一行、每篇一格，按实际篇数画出，首次加载时格子依次升起一次）；没有系列时换成最近更新列表。下面是系列卡片（整卡可点，悬停上移 2px、边框转 accent）、不属于系列的精选、最新文章。
- **文章卡片**：无边框，列表项之间用分隔线。标题 1.1875rem/650，下方是摘要（muted，最多 2 行）和元信息行；列表里默认不显示标签。hover 时标题变为 accent 色。
- **上一篇 / 下一篇**：两张描边卡片，悬停上移 2px，箭头向外移动。
- **标签**：`#标签名` 文本链接，muted 色，hover 变为 accent。不用胶囊背景。
- **代码块**：圆角 10px，背景 `--wisp-code-bg`，1px border。顶部一条标题栏（桌面 2.25rem，触屏 2.75rem）：左边小写等宽的语言名，右边复制按钮；代码从标题栏下方开始，横向滚动不会滚进标签下面。复制成功后显示 ✓ 并通过 `aria-live` 播报“已复制”。行号用 CSS counter 实现，颜色 subtle，不可选中。
- **表格**：包在可聚焦的 `div.wisp-table` 里，表格铺满正文栏，列多时外层横向滚动；表头下一条较深的线，行悬停浅底；单元格里的行内代码不拆行。
- **Mermaid**：按原始尺寸缩放，但不小于 75%（16px 字不小于 12px）；放不下时在图内横向滚动，两侧有滚动阴影。
- **交互讲解**：一张卡片——标题是顶栏，中间是页面底色的舞台，底部 surface 底放说明和控制条。
- **公式块**：上下 1.5em，过宽时横向滚动。
- **图表**：`<figure>`，可选 `<figcaption>`（muted 0.875rem，居中）。右下角有一个小号“下载源文件”链接（见 diagrams.md）。
- **主题切换**：图标按钮，在 light → dark → system 三态之间循环，`aria-label` 写明当前状态。
- **焦点**：全站 `:focus-visible { outline: 2px solid var(--wisp-accent); outline-offset: 2px }`。

## 5. 动效

- 颜色过渡 150ms；位移类微动效 160–220ms，曲线 `--wisp-ease`：链接卡片悬停上移 2px，按钮悬停上移 1px、按下回落，导航和页脚链接下划线从左画出，箭头图标悬停外移。
- 唯一的入场动画是首页首屏：文字上浮淡入一次，系列地图的格子按顺序升起一次。不做滚动触发的淡入。
- 切换主题时不加全局 transition，避免整页颜色闪变。
- `prefers-reduced-motion: reduce` 下关闭所有过渡；交互组件改为手动单步。

## 6. 可访问性底线

- 正文、muted 文字对背景 ≥ 4.5:1；hue 的 stroke 对 bg ≥ 4.5:1；subtle 只用于非文本元素。
- 页面顶部有“跳到正文”链接；语义化地使用 `header/nav/main/article/aside/footer`。
- 所有交互元素都能用键盘操作，焦点可见。
- `scripts/check-contrast.ts` 对 palette.json 做自动对比度检查，作为 CI 的一部分。
