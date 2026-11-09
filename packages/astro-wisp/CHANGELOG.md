# Changelog

版本遵循 [semver](https://semver.org/lang/zh-CN/)。配置项、可覆盖组件的名称与 props、`astro-wisp/*` 导出的不兼容改动只出现在主版本（0.x 期间为次版本）。

## Unreleased

- 页脚改回一行：版权 + GitHub / RSS 图标。0.3.0 加入的系列入口和站点导航与顶栏、首页重复，已移除。

## 0.3.0

- 重新设计阅读布局：页头、页脚、文章网格和首页共用一个外框（`.wisp-shell`），左右边线全站对齐；文章页 ≥ 60rem 显示右侧目录，≥ 72rem 三栏且两侧栏等宽。
- 首页按系列组织：首屏「系列地图」、系列卡片、精选、最新文章；新增 `summarizeSeries()`（`astro-wisp/utils`）。
- 页脚加入系列入口与站点导航；顶栏加入品牌标记、半透明背景、下划线导航，主题按钮按实际明暗显示图标。
- 正文：栏宽 38rem；h2 加分隔线并加大字号；引用块改为浅底 + 强调色竖条；有序列表留出两位数序号的位置；表格铺满正文栏并包进可滚动容器。
- 代码块改为顶部标题栏（语言名 + 复制按钮）；Mermaid 图不再缩到字看不清，改为最小 75% 缩放 + 横向滚动。
- 交互讲解改为标题栏 + 舞台 + 控制区的卡片结构，窄屏控制条两行放下；`Stage` 的默认 `maxScale` 从 1.6 降到 1.15、`minScale` 从 0.72 升到 0.8，画面里的标签放大后不再比正文还大，窄屏上也不小于约 11px（放不下时横向滚动）。
- 修复：公式样式和目录标题公式使用与 rehype-katex 相同的 katex，避免版本不一致时上下标不缩小。

## 0.2.6

- 改进顶栏、页脚、首页精选区、文章三栏布局、目录与系列导航的响应式和可访问性表现。
- 修复含行内公式的目录标题显示，补充公式与交互讲解区域的横向滚动提示。
- 改进交互播放器的减少动态效果行为、代码块复制按钮布局和图表/宽内容的显示。

## 0.2.5

- 修复系列文章上一篇/下一篇按全站顺序跳转的问题，并限制三栏布局中的宽图不覆盖系列栏。
- 增强移动端触控区域、窄屏导航收缩、横向滚动提示和剪贴板失败反馈。
- 修复 Astro base path 下 canonical / OG 图片地址，按语言加载 CJK 字体并补齐基础英文文案。

## 0.2.4

- 支持作者 GitHub 链接、图表操作 metadata 行、轻量目录收起图标和系列文章导航。

## 0.2.3

- 修复正文段落使用 `text-wrap: pretty` 导致浏览器为避免孤行而提前换行的问题。

## 0.2.2

- 修复部署到 Astro `base` 子路径时主题内部链接、RSS 条目和正文资源链接缺少子路径的问题。

## 0.2.1

无运行时代码变化。

- 发布改为只使用 npm Trusted Publishing（GitHub Actions OIDC），自本版本起不再使用任何 npm token；每个版本附带 SLSA provenance。
- 首发时 npm 生成的占位版本 `0.0.0-stage` 不是可用版本，请安装 `astro-wisp@latest`。

## 0.2.0

首个 npm 版本：主题从“复制模板”改为 Astro 集成包。

- `wisp()` 集成：注入路由（`routes` 开关）、自动注册 MDX / Sitemap / Tailwind、Markdown 管线。
- 扩展点：`components`（覆盖组件 / 布局）、`customCss`、`palette`（深度合并，构建期生成令牌并检查对比度）、`postsSchema({ extend })`。
- `astro-wisp/content`、`astro-wisp/utils`、`astro-wisp/explainers`（通用分步讲解积木）。
- 字体改用 Astro Fonts API（Inter、JetBrains Mono、Excalifont），全部自托管、OFL 授权。
- 样式进入 cascade layer：站点的 Tailwind 工具类与 `customCss` 可以覆盖主题。
- `wisp diagram` CLI 与随包分发的 Agent skills（wisp-diagram、wisp-writer）。
- 不兼容：站点域名改用 Astro 的 `site`（移除 `site.url`）；图表 manifest 移到站点根目录的 `diagrams.manifest.json`。
