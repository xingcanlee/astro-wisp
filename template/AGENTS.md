# Wisp starter rules

## Project

基于 `astro-wisp` 主题集成的 Astro 站点模板（starter）。主题页面、布局、组件和样式位于 `node_modules/astro-wisp/`，通过配置与扩展点定制，保证 `pnpm up astro-wisp` 可无冲突升级。

## Commands（Agent 可直接运行，无需请示）

- `pnpm dev` / `pnpm build` / `pnpm preview`
- `pnpm check`
- `pnpm diagram build|check|lint`
- `pnpm exec wisp skills`（查看随主题升级的 `wisp-writer` 与 `wisp-diagram` 路径）
- `pnpm up astro-wisp`（升级主题版本）

## Ownership & Extension Points

- `astro.config.ts`：站点配置 `wisp({...})` 与正式域名 `site`；更换配色使用 `wisp({ palette })`。
- `src/components/`：覆盖组件或布局，在 `wisp({ components: { Footer: './src/components/Footer.astro' } })` 注册，可 `import Default from 'astro-wisp/components/Footer.astro'` 包装默认实现。
- `src/styles/custom.css`：在 `wisp({ customCss: ['./src/styles/custom.css'] })` 注册；页面内可使用 Tailwind 语义工具类（`bg-surface`、`text-muted`、`border-border`）。
- `src/pages/`：自定义页面前先用 `wisp({ routes: { about: false } })` 关掉主题路由；文章仅通过 `getPosts()`（`astro-wisp/utils`）读取。
- `src/content/posts/<slug>/index.md(x)` 与同目录 `diagrams/`：文章正文从二级标题开始，frontmatter 必填 `title`、`description` 和 `pubDate`；图表源文件与生成的 `.wisp.svg` 放在同一目录。
- `node_modules/astro-wisp/`：**只读**，由包管理器维护。

## Done means（验收与证据标准）

- 提交前至少运行 `pnpm check` 与 `pnpm build` 且全部通过。
- 修改图表源文件后已运行 `pnpm diagram build`，并同步提交 `.wisp.svg` 与 `diagrams.manifest.json`。
- 报告中的文件引用均附**仓库相对路径 + 1-based 行号**及命令输出；未执行的项标为 `未实测`。

## Never（硬禁区）

- 禁止修改 `node_modules/astro-wisp/`。
- 禁止硬编码十六进制颜色（颜色只能使用 `--wisp-*` / `--wd-*` 令牌）。
- 禁止绕过 `getPosts()` 直接调用 `getCollection('posts')`。
- 未经明确指示，禁止 `git push`、部署或触碰 `.env*`；禁止编造命令输出。
