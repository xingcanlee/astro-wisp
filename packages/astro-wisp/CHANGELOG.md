# Changelog

版本遵循 [semver](https://semver.org/lang/zh-CN/)。配置项、可覆盖组件的名称与 props、`astro-wisp/*` 导出的不兼容改动只出现在主版本（0.x 期间为次版本）。

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
