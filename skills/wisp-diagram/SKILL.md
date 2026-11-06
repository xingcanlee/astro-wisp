---
name: wisp-diagram
description: 为博客、技术文档绘制 Wisp 风格的概念图、架构图、模型结构图、算法示意图（自注意力、Transformer、矩阵乘、KV cache、MoE、RAG、训练循环等）。当用户或 Agent 需要画图、生成 .excalidraw / .drawio 源文件、导出可移植 SVG/PNG，或提到 excalidraw、drawio、draw.io、Wisp 风格图表、语义色（Q/K/V）、图表调色板时使用。不适用于数据图表（折线图、柱状图等）。
---

# wisp-diagram：产出 Wisp 风格图表

目标：产出**风格一致、可主题化、可移植**的图表。源文件（`.excalidraw` / `.drawio`）+ 生成的 `*.wisp.svg`：同一个 SVG 在 Wisp 站点内联时跟随站点主题，在 GitHub README / 其他博客以 `<img>` 使用时跟随系统明暗。

本 skill 目录自包含，可整体复制到任何项目（`~/.claude/skills/` 或 `<项目>/.claude/skills/`）。所有命令都在 `scripts/` 目录下运行。

```
SKILL.md
palette.json          调色板（唯一的颜色来源）
reference/            style-guide.md  excalidraw-skeleton.md  drawio-cheatsheet.md  ml-patterns.md
assets/               wisp.excalidrawlib  wisp-drawio-library.xml  drawio-config.json  drawio-colors.txt
scripts/              skeleton-to-excalidraw.ts  lint.ts  normalize.ts  build.ts  export-png.ts
```

## 一次性准备

```bash
cd skills/wisp-diagram/scripts
npm install                      # 安装依赖（也可以复用宿主项目已安装的同名依赖）
npx playwright install chromium  # 导出用的无头浏览器
npx tsx build.ts --probe         # 查看 draw.io 导出方式（cli / docker / browser）是否可用
```

draw.io 导出按 cli → docker → browser 顺序自动回退；browser 方式首次会下载 draw.io viewer 脚本并缓存（离线环境可设 `WISP_DRAWIO_VIEWER=<本地文件>`）。

## 1. 先选工具

| 场景 | 选择 | 源文件 |
|---|---|---|
| 流程图、时序图、状态图、类图等**结构化**图，节点关系为主 | **Mermaid**（最省事，直接写进正文的 ` ```mermaid ` 代码块；Wisp 站点构建期渲染） | 无独立文件 |
| 概念图、直觉示意、手绘风格、ML 算子数据流 | **Excalidraw** | `name.excalidraw`（JSON） |
| 精确对齐的模型结构图、分层架构图、需要直角折线和多页 | **draw.io** | `name.drawio`（**未压缩** XML） |
| 逐步演示、可交互 | 不属于本 skill（React 组件） | — |

原则：能用 Mermaid 讲清楚就别画图；手绘风格不超过约 12 个节点；同一篇文章里风格统一。

## 2. 工作流（5 步）

以下以 `diagrams/attention` 为例，路径按实际位置替换。

**① 判断类型**（见上表）。选定后读对应 reference：Excalidraw → `reference/excalidraw-skeleton.md`；draw.io → `reference/drawio-cheatsheet.md`；常见模型图式直接从 `reference/ml-patterns.md` 复制修改。布局原则见 `reference/style-guide.md`。

**② 生成源文件**

- Excalidraw：**写骨架 JSON**（位置、尺寸、label、语义色名、箭头起止 id），再转换。**禁止手写完整的 Excalidraw 元素**（seed、boundElements、version 等字段极易出错）。
  ```bash
  npx tsx skeleton-to-excalidraw.ts diagrams/attention.skeleton.json -o diagrams/attention.excalidraw
  ```
  骨架文件转换后可以删除或留作生成脚本；之后以 `.excalidraw` 为准。
- draw.io：直接写未压缩 mxGraph XML，样式字符串只用 `reference/drawio-cheatsheet.md` 的预设。拿到压缩过的 `.drawio` 时先 `npx tsx normalize.ts file.drawio` 解压。
- 手动在编辑器里画：导入 `assets/wisp.excalidrawlib`（Excalidraw 右侧 Library → Open）或 `assets/wisp-drawio-library.xml`（draw.io：File → Open Library from → Device），按 `assets/drawio-colors.txt` 配置调色板。

**③ lint（先修复）再 build**

```bash
npx tsx lint.ts diagrams/attention.excalidraw --fix      # 非调色板颜色吸附到最近令牌；无法自动修的会列出
npx tsx lint.ts diagrams/attention.excalidraw --strict   # 无任何 error/warn 才算通过
npx tsx build.ts diagrams/attention.excalidraw           # 生成 diagrams/attention.wisp.svg
```

build 常用参数：`--embed-fonts`（内嵌字体子集，发布到外部平台时用）、`--fix`、`--title T --desc D`（覆盖无障碍文本，仅单文件）、`--drawio cli|docker|browser`、`--out-dir DIR`、`--strict`。多页 draw.io 的第 2 页起输出为 `name.page-2.wisp.svg`。

**④ 自检：导出 light 与 dark 预览，用 Read 工具查看**

```bash
npx tsx export-png.ts diagrams/attention.wisp.svg --theme light -o /tmp/attention.light.png
npx tsx export-png.ts diagrams/attention.wisp.svg --theme dark  -o /tmp/attention.dark.png
```

检查：文字重叠、箭头穿过节点、标签压住箭头头部、暗色下看不清、中文被截断。发现问题改源文件，回到 ③ 重新 build。预览 PNG 放临时目录，不要提交。

**⑤ 引用并写 alt**：见下文「使用产物」。**必须提供有意义的 alt 文本**（描述图要表达的结论，而不是“图 1”）。

## 3. 调色板

颜色只能来自 `palette.json`。作画时**只用浅色值**（下表左值）；build 会把它们映射成 `var(--wd-*)`（暗色值由 SVG 自动切换）。不要手选暗色值，不要用调色板之外的任何颜色（lint 报错，`--fix` 吸附到最近的令牌）。

| hue | stroke（线条、文字）light / dark | fill（填充）light / dark | 语义名 |
|---|---|---|---|
| `blue` | `#1d4ed8` / `#60a5fa` | `#dbeafe` / `#1b2740` | `q`、`active` |
| `amber` | `#b45309` / `#fbbf24` | `#fef3c7` / `#38290c` | `k`、`highlight` |
| `green` | `#15803d` / `#4ade80` | `#dcfce7` / `#122d1c` | `v`、`done` |
| `rose` | `#be123c` / `#fb7185` | `#ffe4e6` / `#3a1620` | `grad`、`error` |
| `violet` | `#7c3aed` / `#a78bfa` | `#ede9fe` / `#272040` | `weight` |
| `teal` | `#0f766e` / `#2dd4bf` | `#ccfbf1` / `#0f2c29` | `activation` |
| `orange` | `#c2410c` / `#fb923c` | `#ffedd5` / `#3a2010` | `bias` |
| `slate` | `#475569` / `#94a3b8` | `#e2e8f0` / `#222831` | `mask`、`visited` |

基础色：正文 `fg` `#1d1d1f`（Excalidraw 默认黑 `#000000`/`#1e1e1e` 也会被视为 fg），次要 `muted` `#5c6067`，面 `surface` `#f4f4f2`，边框 `border` `#e2e2dd`，画布白 `#ffffff`（build 会去掉背景）。

### 语义色（所有文章、图表一致）

| 语义名 | 含义 | hue |
|---|---|---|
| `q` | 查询 Query | `blue` |
| `k` | 键 Key | `amber` |
| `v` | 值 Value | `green` |
| `weight` | 权重、参数 | `violet` |
| `activation` | 激活、softmax | `teal` |
| `grad` | 梯度 | `rose` |
| `bias` | 偏置 | `orange` |
| `mask` | 掩码、输入 | `slate` |
| `highlight` | 高亮 | `amber` |
| `visited` | 已访问 | `slate` |
| `active` | 当前/进行中 | `blue` |
| `done` | 完成 | `green` |
| `error` | 错误、损失 | `rose` |

骨架的 `color` 字段可直接写语义名（`"color": "q"`）或 hue 名；draw.io 中查表取 hue 对应的 fill/stroke。

## 4. 风格硬规则

| 项目 | 规则 |
|---|---|
| 网格 | 所有元素 x/y/宽/高取 **8px** 的倍数 |
| 字号 | 只用 **12**（注释）/ **14**（标签）/ **18**（标题）；lint 容差 ±1 |
| 线宽 | **1.5**（常规），**2.5**（强调，一张图一两处）；细线 1 仅用于分隔 |
| 圆角 | 矩形/容器圆角：Excalidraw `round`，draw.io `rounded=1;arcSize=8` |
| 填充 | 纯色填充，使用 hue 的 fill；**禁止渐变** |
| 阴影 | **禁止** |
| 字体 | Excalidraw 用 Excalifont（中文回落 Noto Sans SC，**不用小赖体**）；draw.io 用 `Inter` |
| 手绘 | `roughness: 1`；draw.io 不用 `sketch=1` |
| 背景 | 不画背景矩形，保持透明 |
| 源文件 | `.excalidraw` 为 JSON；`.drawio` 为**未压缩** XML；嵌入图片会使文件膨胀（>2MB 警告） |

## 5. 自检清单

- [ ] lint `--strict` 通过：无非调色板颜色、无阴影/渐变、字号合规、元素在 8px 网格上
- [ ] 语义色用对：Q 蓝、K 琥珀、V 绿、权重紫、激活青、梯度/损失玫红、偏置橙、掩码/输入灰
- [ ] 一张图只讲一件事，节点 ≤ 12（手绘）
- [ ] 连线不穿过节点、不交叉；短连线（间距 < 96px）上没有标签
- [ ] 中文标签每行 ≤ 8–10 个汉字，没有被截断
- [ ] 有标题（`size: "title"` 的文本 / draw.io 页面名）和一句注释
- [ ] light 和 dark 的预览 PNG 都用 Read 看过
- [ ] 已生成 `.wisp.svg`，且源文件修改后重新 build 过
- [ ] alt 文本有意义

## 6. 使用产物

### 在 Wisp 站点中（可选）

站点内置同样功能的 CLI：`pnpm diagram build|check|lint [--fix]`、`pnpm diagram new <skeleton.json> --build`、`pnpm diagram export <文件> --png --theme dark`。
源文件与文章放在一起（`diagrams/` 目录），`.wisp.svg` 也要提交。在 MDX/Markdown 中用标准图片语法引用**源文件**（站点会内联同名 `.wisp.svg`，并附源文件下载链接）：

```md
![自注意力：Q 与 K 打分后对 V 加权求和](./diagrams/attention.excalidraw "图 1：自注意力计算流程")
![Transformer Block 的残差结构](./diagrams/transformer-block.drawio#page=encoder)
```

alt 写入 SVG 的 `<title>`，引号中的说明成为图注；`#page=<页面名>` 选择 draw.io 的页面。`pnpm diagram check` 只校验内容哈希，CI 里不需要浏览器。

### 在其他地方（GitHub README、其他博客、IDE 预览）

直接引用生成的 `*.wisp.svg`：它自带 `<style>`，作为 `<img>` 时通过 `prefers-color-scheme` 跟随**系统**明暗，没有 CSS 变量支持的渲染器会使用属性里的浅色 fallback。

```md
![自注意力计算流程](diagrams/attention.wisp.svg)
```

- 发布到外部平台前用 `build.ts --embed-fonts` 内嵌字体子集（每张图通常几十 KB），避免字体回落。
- 公众号、知乎等不支持 SVG 的平台：`export-png.ts <文件> --theme light --scale 2 -o out.png`（`--transparent` 可得到透明背景；默认内嵌字体）。
- 源文件一并保存在仓库中，便于以后修改；`.excalidraw` 可在 excalidraw.com 打开，`.drawio` 可在 app.diagrams.net 打开。

## 7. 常见错误

| 错误 | 怎么避免 |
|---|---|
| 手写完整 Excalidraw 元素 | 只写骨架，用 `skeleton-to-excalidraw.ts` 转换 |
| 在编辑器里用了调色板外的颜色（吸管、默认色） | 用素材库；lint `--fix` 吸附；仍报错就改源文件 |
| 手选暗色值作画 | 只用浅色值，暗色靠 SVG 自动切换 |
| 骨架箭头穿过第三个节点 | 箭头是中心连线上的直线；调整布局，或改用 draw.io 折线 |
| 短连线加标签，标签压住箭头头部 | 节点间距 ≥ 96 再加标签，否则去掉标签 |
| 坐标不在 8px 网格上 | 所有数值取 8 的倍数 |
| `.drawio` 提交了压缩格式 | `normalize.ts` 解压；File → Properties 取消 Compressed |
| draw.io 标签里的 `&` 没转义 | `html=1` 时写成 `&amp;amp;`，换行写 `&lt;br&gt;` |
| 中文标签过长被截断 | 每行 ≤ 8–10 个汉字，用 `\n` / `<br>` 换行，加宽节点 |
| 改了源文件忘记重新 build | 修改后重跑 `build.ts`（站点里 `pnpm diagram check` 会发现哈希不一致） |
| 没看暗色预览就交付 | 步骤 ④ 的 dark 预览必须看 |
| 空洞的 alt（“图 1”“diagram”） | alt 写图要说明的结论 |
| 用图表工具画数据图 | 折线/柱状等数据图不属于本 skill |

## 8. 排错

- `找不到依赖 ...`：在 `scripts/` 运行 `npm install`。
- `playwright` 启动失败：`npx playwright install chromium`。
- draw.io 导出失败：`npx tsx build.ts --probe` 看哪种方式可用；可用 `--drawio browser|cli|docker` 强制指定。
- lint 报 `unrecognised color`：颜色不是十六进制（如 `rgb()` 之外的特殊值），手工改成调色板里的浅色值。
