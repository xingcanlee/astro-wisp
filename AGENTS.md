# astro-wisp

## Project

Wisp —— 专注中文长文阅读的技术博客主题（Astro 7 集成 + Tailwind 4 + MDX + Pele + React islands）。

开工前必读：

- [`DESIGN.md`](./DESIGN.md)：**外观规范**（字体、配色、圆角、间距、组件样式、品牌原则）；任何样式或组件改动前先读它，若改变了规范须同步更新它。
- [`PRODUCT.md`](./PRODUCT.md)：读者、定位、约束。
- [`docs/README.md`](./docs/README.md)：决策记录与环境前提。
- [`docs/architecture.md`](./docs/architecture.md)：包结构、扩展点（虚拟模块、组件覆盖、路由开关）、样式分层。
- [`docs/tasks.md`](./docs/tasks.md) §0：协作规则（文件所有权、报告格式）。

## Commands（Agent 可直接运行，无需请示）

环境要求：**Node ≥ 22.23.4**、**pnpm 12.18.0**、**uv**（运行写作与图表 skill 脚本）。

- 开发与构建：`pnpm dev` / `pnpm build` / `pnpm preview` / `pnpm build:template`
- 全量与单项校验：`pnpm check`（`astro check` + `tsc` + ESLint + Prettier + vitest + 对比度 + 图表校验） / `pnpm test` / `pnpm test:e2e` / `pnpm exec vitest run <path>`
- 代码风格：`pnpm lint` / `pnpm format` / `pnpm format:check`（提交前 hook 只处理 staged 文件）
- 令牌与图表：`pnpm tokens` / `pnpm contrast` / `pnpm diagram build|check|lint [--fix]`（即 `wisp diagram`）
- 内置 Agent skills：
  - 写文章：[`packages/astro-wisp/skills/wisp-writer/SKILL.md`](./packages/astro-wisp/skills/wisp-writer/SKILL.md)（`uv run packages/astro-wisp/skills/wisp-writer/scripts/new_post.py` / `check_post.py`）
  - 画图：[`packages/astro-wisp/skills/wisp-diagram/SKILL.md`](./packages/astro-wisp/skills/wisp-diagram/SKILL.md)（`pnpm diagram ...`）

## Ownership（路径所有权与隔离边界）

- `packages/astro-wisp/`：主题包源码（npm `astro-wisp`；集成入口 `index.ts` → `src/integration.ts`，注入页面 `src/routes/`，可覆盖组件/布局 `src/components/`、`src/layouts/`，样式 `src/styles/`，通用讲解积木 `src/explainers/`，分发技能 `skills/`）。只放通用积木，不放具体文章讲解组件。
- `packages/astro-wisp/design/palette.json`：默认调色板唯一真相源；修改后必须运行 `pnpm tokens` 同步生成文件（`src/styles/{tokens,pele,diagram}.css`、`src/explainers/core/tones.generated.ts`、`skills/wisp-diagram/palette.json`，有单测检查是否过期）。
- `src/`、`astro.config.ts`、`tests/`：根目录演示站与 Playwright e2e 测试对象（具体讲解组件如矩阵乘放在演示站或文章目录，不进主题包）。
- `template/`：starter 模板（只有配置和内容，工作区内链接到 `packages/astro-wisp`，参见 [`template/AGENTS.md`](./template/AGENTS.md)）。
- `DESIGN.md`、`PRODUCT.md`、`docs/`、`package.json`、`pnpm-workspace.yaml`、`packages/astro-wisp/package.json`：共享规范与构建发布配置；`/swarm` 或多轨道协作中改动须经 `@coordinator` / `@verifier` 确认。

## Hard Rules（架构与视觉规范）

- 颜色只能来自调色板生成的 CSS 变量（`--wisp-*`、图表 `--wd-*`；交互组件用 `Tone`）。
- 主题内部互相引用组件/布局必须经过 `virtual:wisp/components/<Name>`（否则站点无法覆盖）；读配置用 `virtual:wisp/config`；客户端代码只能用 `virtual:wisp/locale`。
- 样式分层：页面骨架与组件 → `@layer components`；正文内容（prose、代码块、图、公式、讲解组件）→ `@layer utilities`（与 typography 插件同层）。Astro 组件的 `<style>` 也须包在对应层内。
- 优先使用框架能力（Astro 的 `injectRoute` / `paginate` / 内容集合 / container API、Vite 虚拟模块、Tailwind 插件、Motion），不自行重复实现。
- 所有页面都通过 `getPosts()`（`astro-wisp/utils`）取文章。
- 中文排版见 `DESIGN.md` Typography：禁止负字距，中文 `em` 不用斜体。
- 图标只用 Lucide（`virtual:wisp/components/Icon`，React 内联 Lucide 路径），圆角只有 3px / 4px。
- 图表源文件 `.excalidraw`（JSON）和 `.drawio`（未压缩 XML）与文章放在一起，生成的 `.wisp.svg` 和 `diagrams.manifest.json` 也要提交。
- Astro 7 的 API 以官方文档为准，`docs/` 中的代码只表达意图。

## Done means（验收与证据标准）

- `pnpm check` 全部通过；涉及构建、路由或模板改动时同步通过 `pnpm build`（及必要时 `pnpm build:template` / `pnpm test:e2e`）。
- 若修改了 `palette.json`，已运行 `pnpm tokens` 且过期校验单测通过；若改变了视觉规范，已同步更新 `DESIGN.md`。
- 报告中每项结论、问题定位与修复均附**仓库相对路径 + 1-based 行号**及命令输出依据；未执行的检查必须明确标为 `未实测`。
- `/swarm` 模式下：完成后发送 `@verifier [done]`（≤ 15 行摘要：改动文件、执行命令及尾部输出、标注 `未实测` 项）；连续受阻超过 2 次向 `@coordinator` 升级。

## Never（硬禁区）

- 禁止硬编码十六进制颜色、Tailwind 原始色阶、`dark:` 颜色变体、阴影、毛玻璃、渐变、彩色粗竖条、眉题（eyebrow），禁止用 emoji 或 Unicode 字符当图标。
- 禁止手改 `pnpm tokens` 生成的文件。
- 禁止绕过 `virtual:wisp/components/<Name>` 互相引用主题内部组件；禁止把 `virtual:wisp/config` 打进客户端代码；禁止直接调用 `getCollection('posts')`。
- 禁止越界修改非自身分配轨道的文件；未经明确指示，禁止 `git push`、发布 npm 包或触碰 `.env*`。
- 禁止编造测试输出或未实际测量的数值。
