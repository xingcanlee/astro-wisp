# Changelog

版本遵循 [semver](https://semver.org/lang/zh-CN/)。配置项、可覆盖组件的名称与 props、`astro-wisp/*` 导出的不兼容改动只出现在主版本（0.x 期间为次版本）。

## 0.5.2 (2026-11-14)

### 变更

- **图表题注与动作**：`<figcaption>` 独立全宽左对齐；桌面端（`≥40rem` 且有精细悬停指针）将「源文件 / draw.io」动作收进图表右上角微浮层（悬停或键盘聚焦显现），窄屏与触屏回退到题注下方左对齐。
- **侧栏（系列与目录）**：左侧系列栏去掉通高竖灰线，篇目与栏顶标题共用外框左轴，仅在当前篇左外侧悬挂 `2px` 强调色短竖标；右侧目录栏仅在当前活跃节保留 `2px` 强调色指示条；双侧栏 `[data-rail-scroll]` 隐藏滚动条轨道，仅靠上下边缘 `mask-image` 渐隐提示可滚。
- **参考与注释**：文末注释列表去掉左侧竖线，编号列与「参考与注释」标题同左轴对齐；同一条注释被多处引用时不再列出 `↑1 … ↑n` 序号尾巴，合并为单枚 `↑` 回链并按最近一次点击的文内引用精准原路返回；柔化注释内行内代码底色。
- **宽表格排版**：`≥48rem` 向两侧轻度外扩 `1rem`；长描述列（`data-wisp-prose`）保底阅读宽度避免被多列数字挤成窄条；横向溢出时首列吸左固定，三线表顶底与行分隔线连续不遮断。
- **全站四层滚动条**：滑块改用半透明前景色、无步进三角箭头；桌面端页面主滚动条统一为 `6px` 悬浮圆角滑块（消除 Windows 悬空 `▲/▼` 三角箭头）；全部内部滚动容器（`:where(body *)`）通过自定义属性 `--wisp-sb` 在悬停、聚焦或拖拽时即时重绘显现 `4px`（指向滑块 `6px`）悬浮圆角滑块；补齐 `overscroll-behavior`、窄屏折叠目录 `60vh` 限高、窄屏展开系列目录自动滚至当前篇、长引用预览浮层限高滚动，以及超宽容器与灯箱大图的 1D/2D 鼠标按住拖拽平移。

### 修复

- **draw.io 公式抗锯齿**：剥离 `drawio-cli` 导出 MathJax SVG 上关闭抗锯齿的 `shape-rendering="crispEdges"`，修复图表内公式锯齿与发虚。
- **中文页西文斜体与无障碍**：`rehype-a11y` 自动为纯拉丁文 `<em>` / `<i>` 补 `lang="en"`，中文文章里的英文论文标题与术语保持真斜体而不打中文着重号。
- **滚动条与溢出阴影缺陷**：修复 Chromium 下容器 `:hover::-webkit-scrollbar-thumb` 不触发重绘及 `html` 继承 `scrollbar-color` 退回原生灰条的问题；移除 Mermaid 容器残留的渐变滚动阴影与行内 `.katex` 无效滚动声明。

## 0.5.1 (2026-11-11)

### 修复

- **Mermaid 饼图与面积填充**：系列填充改为由 hue 描边色混入背景的中间明度，分隔线保持 1px 背景色，切换浅色 / 深色时标签仍满足对比度要求。
- **中文删除线**：加入 `remark-cjk-friendly-gfm-strikethrough@2.3.2`，`.md` 与 `.mdx` 中 `~~文字。~~后文` 均能正确闭合。
- **脚注升级说明**：更正 0.5.0 的表述；0.5.x 输出仍保留 `.footnotes`、`section[data-footnotes]`、`[data-footnote-ref]`、`[data-footnote-backref]` 与 `#footnote-label`，并在此基础上增加 `.wisp-notes`、`.wisp-cite` 等主题类。

### 测试与示例

- 演示站加入 4 篇系列示例文章，覆盖系列栏、书眉位置按钮、窄屏文首详情和无 JS 回落；系列图表源文件按颜色规范收敛到最多 3 种 hue。
- e2e 增加系列导航覆盖；本版也在 Firefox 与 WebKit 各完整运行一次测试套件，主题行为通过，浏览器专属的 KaTeX axe / clipboard permission 检查保留为测试环境差异。

## 0.5.0 (2026-11-11)

本版调整了图题 class、调色板的 8 个 hue、交互讲解的控制条和含公式标题的锚点 id，**自定义了样式、覆盖了组件或带有图表源文件的站点请先看文末「升级说明」**。

### 新增

- **引用**：GFM 脚注（`正文[^key]` + `[^key]: 出处`，作者语法不变）升级为引用。新增 `rehype-citations` 与 `Citations` 组件：文内标记是带方括号的 teal 上标 `[1]`，相邻引用合并成 `[1, 2]`，读屏名称为「参考 3」；文末是带可见标题「参考与注释」（英文「References」）的编号列表，回链用 Lucide 图标，同一条被引用多次时回链带序号；点击平滑跳转并短暂标记目标，有指针悬停的设备上悬停或聚焦标记会弹出该条注释的预览（Popover API）。
- **图题语法统一**：新增 `rehype-figure`，带标题的独立 Markdown 图片 `![alt](./x.webp '图 05-3：…')` 输出为 `<figure class="wisp-figure wisp-image">` + `<figcaption>`；Mermaid 围栏支持 `caption="…"`（也接受 `title=`）。图、图表、Mermaid、`<Figure>` 共用同一套题注：图号（「图 05-3：」「Figure 2.」「Fig. 2:」）拆成 `.wisp-fig-no`（墨色、600、表格数字），没有图号的不自动编号。位图加 1px 发丝线描边。
- **代码块自动换行**：题注行新增「自动换行」按钮，只出现在会横向溢出的代码块上；读者的选择存在 localStorage `wisp-code-wrap`，对整页代码块生效，首帧前写入，不闪动。新增配置 `features.codeWrap`（默认 `false`）决定站点默认是否换行。打印时一律换行。
- **统一的内部滚动条**：站点自己的滚动容器加 `class="wisp-scroll"` 即可使用主题的细滚动条（有指针的设备上滑块平时透明，指针移入或聚焦时出现）；加 `data-wisp-scroll` 属性还会参与横向溢出的边缘渐隐。
- **交互讲解**：说明和标题里可以写 `$…$` 行内公式（按需懒加载 KaTeX，首屏 SSR 即渲染）；标题开头的图号单独加粗。`astro-wisp/explainers` 新增导出 `RichText`、`Tex`、`loadKatex`、`TexLabel`、`nextSpeed`、`MAX_TICKS`，以及类型 `RichTextProps`、`TexProps`、`TexLabelProps`；`astro-wisp/explainers/core` 新增 `parseInlineMath`、`plainInlineMath`、`hasInlineMath`、`splitFigureLabel` 与类型 `RichSegment`。`usePlayer` 返回值新增 `cycleSpeed`；`PlayerLabels` 新增 `speedCycle`；`Player` 新增 `player` 与 `count` 两个可选 prop。
- **wisp-diagram**：新增 `migrate` 命令，调色板换代后按令牌名改写旧源文件的颜色、线宽和圆角（`migrate --from <旧 palette.json> <文件|glob>... [--check]`），也处理素材库（`.excalidrawlib`、`<mxlibrary>`）和 `drawio-config.json`；`lint` 新增 `hue-count` 警告（一张图超过 3 种 hue，`slate` 不计）；SKILL 新增「颜色怎么用」一节和「调色板换代（migrate）」一节。
- **`--wisp-block-gap`**：代码、表格、公式、图、要点块、讲解组件与前后段落之间共用的块级间距（默认 `1.75em`），可在站点样式里覆盖。
- **构建管线**：新增 `remark-cjk-friendly`，`**文字。**后文` 这类紧挨全角标点的强调也能闭合；主题版本或 Markdown 管线变化时，内容层缓存整体失效（见「修复」）。

### 变更

- **图表（Excalidraw / draw.io）**：题注与动作排在同一行，动作靠右、与题注第一行同基线，窄屏落到题注下一行（触控高度 ≥ 44px）。动作的可见文字缩短为「源文件」和「draw.io」，完整含义在 `aria-label` / `title`；容器由 `.wisp-diagram-actions` 改为 `.wisp-fig-actions`；有题注时 figure 的可访问名称只取题注文字；`.wisp-has-caption` 已删除。
- **调色板**：8 个 hue 的 stroke / fill 全部重调为「印刷油墨」风格（描边是低彩度的深色墨，填充是近纸色的淡洗，暗色同理），新旧对照见下方「升级说明」。图表的圆角由 8px 改为 4px（`diagram.corner-radius`，与页面 box 圆角一致；draw.io 用 `absoluteArcSize=1;arcSize=8`，Excalidraw 用 `roundness: {type: 3, value: 4}`），线宽由 1 / 1.5 / 2.5 改为 1 / 1.25 / 2。图表默认节点改为中性（`surface` 底 + `muted` 1px 描边 + `fg` 文字），颜色只给语义角色，一张图最多 3 种 hue。
- **文章页布局**：
  - 系列栏默认收起，栏顶只留一行吸顶的按钮「系列名 7 / 10 ⌄」，与右侧目录的标题行成对；状态在 `html[data-series="open|collapsed"]`，存 localStorage `wisp-series-open`，首帧前写入；页眉里的「7 / 23 篇」在 ≥80rem 时是同一个开关（按钮）。无 JS 时篇目表完整显示。
  - 目录栏顶改为带文字标签的标题按钮「目录 ⌄」，收起后仍是这一行；篇目在下方独立滚动的层里，标题行不随之滚动。
  - DOM 顺序改为系列 → 目录 → 正文，等于键盘顺序，各自的位置由网格决定；60–80rem 两栏时文首的系列 `<details>` 占正文列第一行。
  - 滚到页面底部时目录高亮最后一节；点击目录项立即高亮被点的那一项。
  - 侧栏标题行贴着外框边线；目录和系列栏的编号列改为 muted 色（编号是读者找位置用的文字，不再用 subtle）。
  - 中文章节标题在构建期按词切分并插入 `<wbr>`，配合 `word-break: keep-all`，只在词边界换行（不再出现「矩 / 阵」）。
- **主题切换**：三种偏好各一个 Lucide 图标（浅色 `sun`、深色 `moon`、跟随系统 `sun-moon`），显示的是当前偏好而不是当前明暗，不再叠「A」角标。
- **返回顶部**：按钮 44×44（原 40×40），右缘与外框内容边线对齐；页脚进入视口时按钮停在页脚上方，不再盖住页脚链接。
- **Lightbox**：关闭按钮改为 44×44 方形、固定在视口右上角；窄屏（≤40rem）按图的自然宽度显示（最多 2 倍视口宽）、可上下左右平移并在打开时居中；点图以外的空白处关闭。
- **正文**：
  - h2 / h3 的编号是标题第一行里的 inline-block，与标题文字同基线；≥80rem 悬挂在栏间距里，更窄时标题加同宽的左内边距，换行后续行悬挂对齐，列宽随编号位数变化。
  - 横向溢出提示由右缘内阴影改为边缘渐隐：哪一侧还有内容，哪一侧在 1.5rem 内渐隐到容器底色，滚到头消失；键盘聚焦时去掉渐隐。
  - 引用块在浅底之外加 1px 发丝线（暗色里单靠底色看不出是一个块）；后面不再需要额外的彩色竖条。
  - 表格单元格里的行内代码只在空格处换行（记号包进 `.wisp-tok`，复制出来的文字不变），不再在 `file.py:234-358` 的连字符处断开。
  - 正文段落加 `text-wrap: pretty`，避免段末只剩一个字或标点落单。
  - 长代码块折叠后点「收起」，会把代码块顶端拉回页眉下方，读者回到这段代码的开头。
- **首页与路由**：首页目录的篇目行改为「编号 | 标题 | 点线引导 | 阅读时长」，≥80rem 分两栏；归档页每行拆出编号列，标题左缘对齐，系列名一列；分类、标签、归档、404 等页的页头与 `Page` 布局同一规格（标题 + 说明 + 1px 分隔线）；列表里的计数改用对比度足够的颜色；触屏设备上标题链接、标签链接、分页链接的命中区加大（≥ 44px / ≥ 32px）。分页链接的下划线只画在文字下。
- **页眉**：品牌名、书眉、导航按基线对齐，整行在 56px 里垂直居中；章节标题前的「·」随标题一起淡入。
- **交互讲解**：
  - 说明区按全部步骤里最高的一条预留高度，舞台高度只增不减，播放时卡片不再上下跳。
  - 控制条重排为「上一步 / 播放 / 下一步」+ 步数 + 倍速；倍速由 0.5× / 1× / 2× 三个按钮改为一个循环按钮（0.5× → 1× → 2×），按「最宽的一档」预留宽度；播到最后一步时播放键变成「重新播放」图标（`rotate-ccw`）。
  - 进度条改为带填充和刻度的轨道（步数 ≤ 24 时每步一个刻度，更多时只画连续的线）；有标题时步数显示在标题行。
  - 删除「第一步」「最后一步」按钮，键盘 Home / End 保留。
  - 步数文字、倍速文字用表格数字并预留宽度，切换时周围不移动。
- **其他**：`Pagination`、`Header` 主导航的 `aria-label`随站点语言切换（中文 / 英文）；系列栏的地标名改为「系列：名称」。

### 修复

- **含行内公式的标题 id**：此前 Astro 在 rehype-katex 之后取文字，KaTeX 的 MathML 与 HTML 两份文字会拼成 `hreshreshres` 这样的乱码。现在由源码生成 id（只留 ASCII 字母数字，`H^{res}` → `Hres`，`\mathcal{H}^{res}` → `Hres`），新增依赖 `github-slugger`。不含公式的标题 id 不变。
- **内容层缓存**：升级主题后，`.md` 文章仍是 `.astro/data-store.json` 里旧管线的 HTML，而 `.mdx` 每次重新编译，两者渲染不一致。现在主题的插件源码、主题版本和 `pele` / `katex` / `rehype-katex` / `remark-math` / `remark-cjk-friendly` 的版本会作为指纹进入 astro 配置摘要，一变内容层整体失效并重新渲染。
- **键盘与读屏**：只有确实横向溢出的容器（代码、表格、公式、讲解舞台、Mermaid、`data-wisp-scroll`）才有 `tabindex`，不溢出的不再是无意义的 Tab 停靠点；`aria-label` 的「，可横向滚动」后缀从原始名称重新拼，反复缩放窗口不再叠加。markup 里的 `tabindex=0 data-wisp-tab` 只是无 JS 时的回落。
- **`astro dev` 里的 katex**：别名的裸 `katex` 现在指向 ESM 入口 `dist/katex.mjs`（此前指到目录，dev 的 SSR 会加载 UMD 入口并报错）。
- **KaTeX 字体预加载**：含公式的页面预加载最常用的两份 KaTeX 字体（Main 与 Math），公式换上字体时的重排更早发生。
- **`/page/n/`**：站点有系列时首页是总目录、没有分页列表，此时不再生成 `/page/n/`，首页也不显示分页；没有系列时分页排除精选区的文章，第 1 页与 `/page/2/` 起的切分首尾相接，不再漏文章或重复。
- **首页分页间距**与分页链接的图标 / 文字对齐。

### 升级说明

- **class 改名**：自定义样式或覆盖组件的站点请检查：`.wisp-diagram-actions` → `.wisp-fig-actions`；`.wisp-has-caption` 已删除（题注永远在图下，不再按有无题注切换样式）；图号新增 `.wisp-fig-no`，动作的题注文字新增 `.wisp-fig-text`。
- **带标题的 Markdown 图片现在会显示题注**：`![alt](./x.webp '标题')` 的 title 由悬停提示变成图下的 `<figcaption>`。不想要题注就去掉 title。
- **含公式的标题，锚点 id 会变**：含行内公式的标题 id 改为由源码生成（见「修复」），已有的深链接（外部引用、站内 `#锚点`）需要同步更新。不含公式的标题不受影响。
- **有系列的站点不再生成 `/page/n/`**：首页是总目录。如有外部链接指向 `/page/2/` 等，请改指向首页。
- **图表源文件需要迁移调色板**：旧源文件里的十六进制不在新调色板里。不要用 `lint --fix`（按 ΔE 吸附到最近的令牌，最近的不一定是同名令牌，例如旧的紫会吸到新的灰），用 `migrate` 按令牌名改写，并把线宽和圆角一起换掉：

  ```bash
  W="uv run skills/wisp-diagram/scripts/wisp_diagram.py"   # skill 的安装路径见 SKILL.md
  git show <旧版本>:packages/astro-wisp/design/palette.json > /tmp/old-palette.json   # 旧版调色板
  $W migrate --from /tmp/old-palette.json 'src/content/**/diagrams/*.excalidraw' 'src/content/**/diagrams/*.drawio' --check   # 退出码 1 = 有文件要改
  $W migrate --from /tmp/old-palette.json 'src/content/**/diagrams/*.excalidraw' 'src/content/**/diagrams/*.drawio'
  $W lint 'src/content/**/diagrams/*.excalidraw' 'src/content/**/diagrams/*.drawio'   # 再看 hue-count 等警告
  pnpm diagram build --force
  ```

  已经是新值的文件再跑一遍不会变化；生成的 `.wisp.svg` 和 `diagrams.manifest.json` 需要重新提交。8 个 hue 的新旧值（light 值；dark 值见 `design/palette.json`）：

  | hue    | stroke 旧 → 新        | fill 旧 → 新          |
  | ------ | --------------------- | --------------------- |
  | blue   | `#1d4ed8` → `#2f5783` | `#dbeafe` → `#e9f2fb` |
  | amber  | `#b45309` → `#7b5518` | `#fef3c7` → `#fbf2df` |
  | green  | `#15803d` → `#2c522d` | `#dcfce7` → `#e9f5e9` |
  | rose   | `#be123c` → `#984646` | `#ffe4e6` → `#fcedec` |
  | violet | `#7c3aed` → `#4d335c` | `#ede9fe` → `#f5eef9` |
  | teal   | `#0f766e`（不变）     | `#ccfbf1` → `#e3f5f3` |
  | orange | `#c2410c` → `#762f06` | `#ffedd5` → `#fceee4` |
  | slate  | `#475569` → `#464e57` | `#e2e8f0` → `#eaedf2` |

- **交互讲解**：说明和标题里可以（可选）写 `$…$` 行内公式；`$` 不成对时按原文显示。如果你自己拼了播放器控制条或依赖「第一步 / 最后一步」按钮、三个倍速按钮（`aria-pressed`）的选择器，请改为新的循环倍速按钮（`.wisp-player__speed`）；自定义 `labels` 时可以补上 `speedCycle`。
- **中文强调后的多余空格不再需要**：`remark-cjk-friendly` 之后，`**文字。**后文` 可以直接紧挨着写，不必为了让 `**` 闭合而在后面加空格；已有的空格可以保留，但可以删掉。
- **脚注**：写法不变，文末列表现在是「参考与注释」。0.5.x 仍保留 0.4.3 可匹配的 `.footnotes`、`section[data-footnotes]`、`[data-footnote-ref]`、`[data-footnote-backref]` 和 `#footnote-label`；同时增加 `.wisp-cite`、`.wisp-notes` 等主题类，站点可以在原选择器上继续覆盖，也可以按需补充新类。

## 0.4.3

- **修复**：改进图表渲染错误的 cause 链，保留底层错误便于定位；修正特殊字符 taxonomy slug 的清理逻辑。
- **质量门禁**：加入 ESLint、Prettier、staged 文件自动修复和 CI 检查；统一使用 pnpm 12.18.0。

## 0.4.2

- **版式**：正文栏从 38rem 加宽到 42rem（≥768px 时 714px，约 42 个汉字），给代码、公式和图多留出约 70px；栏间距从 3rem 加到 4rem，侧栏从 15rem 收到 14rem，系列栏 / 目录和正文之间不再显得挤。三栏布局的断点从 72rem 提到 80rem，1152–1279px 宽的窗口改为「正文 + 目录」两栏，正文不会被两个侧栏挤窄。页眉、页脚、首页共用的外框随之从 74rem 变为 78rem。
- **wisp-diagram**：画布宽度建议相应改为 640–700px。

## 0.4.1

- **侧栏**：系列栏和目录的滚动条平时不再显示（页面上只剩主滚动条一根），指针移入或键盘聚焦到栏内时才出现细滑块；上下哪一头还有内容，哪一头才渐隐。打开文章时系列栏自动滚到当前篇，长系列的后半段不用再手动找位置。
- **图表**：删除题注下的缩放比例标记（「31% · 点击放大」，`data-wisp-scale`）。图应按正文栏宽度来画（自然宽度约 650px），点击仍可在 Lightbox 里看原尺寸。
- **修复** draw.io 标签里的行内公式被排成每个公式独占一行、撑出节点（Tailwind preflight 的 `svg { display: block }` 作用到了 MathJax 输出上）。
- **wisp-diagram**（画图 skill）：
  - 布局规则改为按正文栏宽度画：画布宽 640px、流程从上到下、分支并排成列；文章里的图不在图内重复标题。`lint` 新增 `width` 规则（超过 720px 警告）。
  - draw.io：browser 导出方式现在会渲染 `math="1"` 页面里的公式（此前原样输出 `\(...\)`），MathJax 从 viewer.diagrams.net 缓存，`cache warm` 会预取；公式的排版样式写进 SVG 本身，不依赖宿主页面 CSS。`lint` 新增 `math` 规则（标签里有 `\(...\)` 但页面 `math="0"` 报错，`$$...$$` 警告）。速查表新增「公式」一节。
  - Excalidraw 骨架：两个矩形正对时箭头自动画成水平 / 竖直线（不再是中心连线上的斜线）；新增 `via` 拐点，可以走直角折线；连线标签四周留出空隙，线条不再贴着字。**已有骨架重新 `new` 后箭头走向会变**，已生成的 `.excalidraw` 不受影响。
  - 参考图式（`ml-patterns.md`）全部收进 680px 以内，自注意力图式改为纵向排布。

## 0.4.0

整体视觉重做：主题按「一本装订好的技术参考手册」来排。外观规范写进新的 `DESIGN.md`（随包发布，`node_modules/astro-wisp/DESIGN.md`）。**不兼容 0.3.x 的外观与部分 class**，自定义了样式或覆盖了组件的站点需要对照下列变化检查。

- **书眉**：页眉改为实色底 + 发丝线，高 56px（`--wisp-header-h`），去掉毛玻璃。文章页在站点名后显示「/ 系列 · 7 / 23 篇」，正文标题滚出视口后淡入章节标题。`Base` 与 `Header` 新增 `running` prop。阅读进度改为压在页眉下沿的 1px 线。
- **章首**：去掉标题上方的系列眉题（`.wisp-post-kicker` 已删除）。标题以编号开头（如「05 MLA …」）时，编号拆成单独的大号章节号（`.wisp-chapter-no`）。元信息行去掉图标，标题区以一条发丝线收住。
- **编号导航**：正文 h2/h3 自动编号（1、2.1…，宽屏时 h2 编号悬挂在栏间距里），目录用同一算法编号并与之对应。系列栏改为「编号列 + 悬挂标题」，当前篇用 1px 强调色轨道标出。
- **首页**：改为扉页 + 总目录。每个系列是一个「部分」，列出全部篇目，带点线引导和阅读时长。之后是「其他文章」（不属于系列的文章）和「修订记录」。删除「系列地图」、系列卡片和首页的「最新文章」列表（没有系列时仍显示文章列表并分页）。
- **归档**：每年一张三线列表（日期 | 标题 | 所属系列）。
- **正文**：h2 不再画分隔线；引用块改为浅底「要点块」，去掉彩色竖条；表格改为三线表；图注左对齐。
- **代码清单**：圆角 4px，题注行与代码同底，字号 0.8125rem。宽屏向两侧各伸出 1rem，行尾注释少截断。
- **图表**：题注独占一行，下载 / 打开 draw.io 链接移到题注下方。图被缩到 60% 以下时在题注下一行标出缩放比例（「31% · 点击放大」）。
- **上一篇 / 下一篇**：从两张卡片改为章末的一条收口线加左右两格。
- **形状**：全站圆角只有 3px / 4px（调色板 `radius` 改为 3 / 4 / 4，Mermaid 节点随之变化）；回到顶部按钮改为方形。删除 `.wisp-eyebrow`。
- **图标**：交互讲解播放器的 ⏮◀▶⏸⏭ 字符改为 Lucide 图标（新增 `PlayerIcon`），Lightbox 关闭按钮改为 Lucide `x`。主题内不再用字符当图标。
- 文档：新增 `DESIGN.md`（外观规范）和 `PRODUCT.md`（产品约束）。`docs/design-system.md` 只保留令牌机制。
- 页脚改回一行：版权 + GitHub / RSS 图标。

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
