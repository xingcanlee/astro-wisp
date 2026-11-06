# Wisp starter

这是一个可直接复制的 Wisp 站点 starter，不包含主题仓库的示例文章、测试 fixture、截图或开发文档。

## 使用

从 `astro-wisp` 仓库获取 `template/` 后复制到新目录：

```bash
git clone --depth 1 https://github.com/xingcanlee/astro-wisp.git astro-wisp-source
cp -R astro-wisp-source/template my-blog
cd my-blog
pnpm install
pnpm dev
```

Windows PowerShell 可以使用：

```powershell
git clone --depth 1 https://github.com/xingcanlee/astro-wisp.git astro-wisp-source
Copy-Item -Recurse astro-wisp-source/template my-blog
Set-Location my-blog
pnpm install
pnpm dev
```

首次使用前请编辑 `src/wisp.config.ts`，至少修改站点标题、作者和正式 URL；再编辑 `src/content/pages/about.md`，并替换 `src/content/posts/starter/index.md`。

## 目录边界

- `src/wisp/`、`src/layouts/`、`src/pages/`：Wisp 主题运行时。一般不需要修改；主题仓库会通过同步脚本刷新它们。
- `src/content/`：你的文章和页面。每篇文章放在 `src/content/posts/<slug>/` 下。
- `src/wisp.config.ts`：你的站点配置，是最常用的修改入口。
- `design/palette.json`：可选的设计令牌源；修改后运行 `pnpm tokens`。
- `skills/wisp-diagram/`：可选的图表生成 skill；只使用 Mermaid 时不需要额外安装浏览器。

模板刻意只保留一篇可替换的 starter 文章和一个关于页，避免把主题仓库的演示内容带进用户站点。图表 manifest 为空，新增图表后运行 `pnpm diagram build`，并提交源文件、`.wisp.svg` 和 manifest。

## 命令

```bash
pnpm dev       # 开发服务器
pnpm build     # 生产构建
pnpm check     # Astro/TypeScript/令牌对比度/图表 manifest 检查
pnpm tokens    # 根据 design/palette.json 生成主题令牌
pnpm diagram check
```

环境要求：Node.js `>=22.23.4` 和 pnpm。
