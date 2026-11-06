# Wisp starter rules

- 站点配置在 `src/wisp.config.ts`；文章只通过主题提供的 `getPosts()` 读取。
- 文章放在 `src/content/posts/`，正文从二级标题开始；每篇文章必须有 `title`、`description` 和 `pubDate`。
- 颜色只能使用 `design/palette.json` 生成的 `--wisp-*` / `--wd-*` 令牌。修改调色板后运行 `pnpm tokens`，不要手改生成的 CSS。
- 图表源文件和生成的 `.wisp.svg` 与文章放在同一个 `diagrams/` 目录；修改源文件后运行 `pnpm diagram build`。
- 主题运行时位于 `src/wisp/`，除非确实要扩展主题，否则优先修改站点配置、页面内容和文章。
- 提交前至少运行 `pnpm check` 和 `pnpm build`。
