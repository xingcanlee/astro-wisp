import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkPele from './plugins/remark-pele';
import remarkDiagram from './plugins/remark-diagram';
import remarkReadingTime from './plugins/remark-reading-time';
import remarkHasMath from './plugins/remark-has-math';
import rehypeA11y from './plugins/rehype-a11y';
import { copyDiagramSources, diagramDevMiddleware } from './lib/diagram-assets';
import { wispShikiConfig } from './shiki';
import { defineWispConfig, type WispConfig, type WispConfigInput, type WispRuntime } from './config';
import { mergePalette, readPalette, type PaletteOverride } from './tokens/palette';
import { genThemeCss } from './tokens/generate';
import { checkContrast } from './tokens/contrast';
import { wispFonts } from './fonts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const astroFiles = (dir: string) =>
  readdirSync(here(dir))
    .filter((f) => f.endsWith('.astro'))
    .map((f) => f.slice(0, -'.astro'.length));

/** 可以通过 `components` 覆盖的组件与布局名（与 src/components、src/layouts 下的文件名一致）。 */
export const OVERRIDABLE_COMPONENTS = astroFiles('./components');
export const OVERRIDABLE_LAYOUTS = astroFiles('./layouts');

/** 主题注入的路由：routes 开关键 → [pattern, 入口文件]。 */
const ROUTES: Record<keyof WispConfig['routes'], Array<[string, string]>> = {
  home: [['/', './routes/index.astro'], ['/page/[page]', './routes/page/[page].astro']],
  posts: [['/posts/[...id]', './routes/posts/[...id].astro']],
  archive: [['/archive', './routes/archive.astro']],
  tags: [['/tags', './routes/tags/index.astro'], ['/tags/[tag]', './routes/tags/[tag].astro']],
  categories: [['/categories', './routes/categories/index.astro'], ['/categories/[cat]', './routes/categories/[cat].astro']],
  about: [['/about', './routes/about.astro']],
  rss: [['/rss.xml', './routes/rss.xml.ts']],
  notFound: [['/404', './routes/404.astro']],
};

const fromRoot = (root: string, p: string) => (isAbsolute(p) ? p : resolve(root, p));
/** customCss：`./` 开头或绝对路径按项目根解析，其余（包名）交给 Vite 解析。 */
const cssSpecifier = (root: string, p: string) => (p.startsWith('.') || isAbsolute(p) ? resolve(root, p) : p);

/**
 * Wisp 主题集成。站点只需要：
 *
 * ```ts
 * export default defineConfig({ site: 'https://example.com', integrations: [wisp({ site: { title: '…' } })] });
 * ```
 *
 * 集成负责：注入路由（injectRoute）、注册 MDX / Sitemap / Tailwind、Markdown 管线（remark/rehype/Shiki）、
 * 组件覆盖与运行时配置（Vite 虚拟模块）、调色板覆盖（codegen 目录）、图表源文件下载。
 */
export default function wisp(input: WispConfigInput = {}): AstroIntegration {
  const config = defineWispConfig(input);
  let root = process.cwd();

  return {
    name: 'astro-wisp',
    hooks: {
      'astro:config:setup': ({ config: astroConfig, updateConfig, injectRoute, command, logger, createCodegenDir, addWatchFile }) => {
        root = fileURLToPath(astroConfig.root);
        const dev = command === 'dev';
        if (!astroConfig.site) {
          logger.warn('astro.config 未设置 `site`：RSS、Sitemap、canonical 与图表下载链接需要绝对地址，暂用 https://example.com。');
        }
        const site = astroConfig.site ?? 'https://example.com';

        // ---- 组件覆盖 ----
        const names = new Set([...OVERRIDABLE_COMPONENTS, ...OVERRIDABLE_LAYOUTS]);
        const unknown = Object.keys(config.components).filter((k) => !names.has(k));
        if (unknown.length) {
          throw new Error(`[astro-wisp] components 中有未知的组件名：${unknown.join(', ')}。可覆盖：${[...names].join(', ')}`);
        }
        const componentFile = (name: string): string => {
          const override = config.components[name];
          if (override) return fromRoot(root, override);
          return OVERRIDABLE_LAYOUTS.includes(name) ? here(`./layouts/${name}.astro`) : here(`./components/${name}.astro`);
        };

        // ---- 调色板：有覆盖时生成到 codegen 目录，否则直接用包内提交的产物 ----
        let themeCss = [here('./styles/tokens.css'), here('./styles/pele.css'), here('./styles/diagram.css')];
        if (config.palette !== undefined) {
          let override: PaletteOverride;
          if (typeof config.palette === 'string') {
            const file = fromRoot(root, config.palette);
            addWatchFile(file);
            override = readPalette(file);
          } else {
            override = config.palette as PaletteOverride;
          }
          const palette = mergePalette(override);
          const bad = checkContrast(palette).filter((r) => !r.pass);
          for (const r of bad) logger.warn(`调色板对比度不足 4.5:1 —— [${r.mode}] ${r.pair}: ${r.ratio.toFixed(2)}`);
          const dir = fileURLToPath(createCodegenDir());
          mkdirSync(dir, { recursive: true });
          const file = join(dir, 'theme.css');
          writeFileSync(file, genThemeCss(palette));
          themeCss = [file];
        }

        const runtime: WispRuntime = {
          site: config.site,
          nav: config.nav,
          social: config.social,
          home: config.home,
          features: config.features,
          mermaid: config.mermaid,
          rss: config.rss,
          taxonomy: config.taxonomy,
          routes: config.routes,
          root,
          siteUrl: String(site),
          base: astroConfig.base,
        };

        const virtualModules: Record<string, string> = {
          'virtual:wisp/config': `export default ${JSON.stringify(runtime)};`,
          // 客户端 island 只需要语言；不要把整份配置（含项目根路径）打进浏览器 bundle
          'virtual:wisp/locale': `export const lang = ${JSON.stringify(config.site.lang)};`,
          'virtual:wisp/theme-css': themeCss.map((f) => `import ${JSON.stringify(f)};`).join('\n'),
          'virtual:wisp/user-css': config.customCss.map((f) => `import ${JSON.stringify(cssSpecifier(root, f))};`).join('\n'),
        };
        for (const name of names) {
          virtualModules[`virtual:wisp/components/${name}`] = `export { default } from ${JSON.stringify(componentFile(name))};`;
        }

        // ---- Markdown 管线 ----
        const remarkPlugins: any[] = [];
        const rehypePlugins: any[] = [];
        if (config.features.math) remarkPlugins.push(remarkMath);
        if (config.features.mermaid) remarkPlugins.push([remarkPele, { strict: config.mermaid.strict, dev }]);
        remarkPlugins.push([
          remarkDiagram,
          { dev, downloads: config.features.diagramDownload, siteUrl: String(site), base: astroConfig.base, root },
        ]);
        remarkPlugins.push(remarkReadingTime, remarkHasMath);
        if (config.features.math) rehypePlugins.push(rehypeKatex);
        rehypePlugins.push(rehypeA11y);

        // ---- 依赖的集成：已由站点自行注册时不重复添加 ----
        const has = (name: string) => astroConfig.integrations.some((i) => i.name === name);
        const integrations: AstroIntegration[] = [];
        if (!has('@astrojs/mdx')) integrations.push(mdx());
        if (!has('@astrojs/sitemap') && astroConfig.site) integrations.push(sitemap());

        updateConfig({
          integrations,
          // Astro Fonts API：与站点自己的 fonts 配置合并（数组拼接），站点可以再注册其他字体
          fonts: wispFonts(),
          markdown: {
            // Astro 7 默认使用 Sätteri；Wisp 依赖 remark/rehype 生态，显式使用 unified 处理器
            processor: unified({ remarkPlugins, rehypePlugins }),
            shikiConfig: wispShikiConfig(config),
          },
          vite: {
            ssr: {
              noExternal: [
                // RSS 全文渲染静态导入 @astrojs/mdx/server.js，需要打进 SSR 产物（见 routes/rss.xml.ts）
                '@astrojs/mdx',
                // Base 布局在服务端 import 字体 CSS；外部化后 Node 无法加载 .css（dev 下报 Unknown file extension）
                /^@fontsource-variable\//,
              ],
            },
            plugins: [
              tailwindcss(),
              {
                name: 'astro-wisp:virtual',
                resolveId(id: string) {
                  if (id in virtualModules) return `\0${id}`;
                },
                load(id: string) {
                  if (id.startsWith('\0virtual:wisp/')) return virtualModules[id.slice(1)];
                },
              },
            ],
          },
        });

        // ---- 路由 ----
        for (const [key, routes] of Object.entries(ROUTES) as Array<[keyof WispConfig['routes'], Array<[string, string]>]>) {
          if (!config.routes[key]) continue;
          for (const [pattern, entry] of routes) injectRoute({ pattern, entrypoint: new URL(entry, import.meta.url) });
        }
      },
      'astro:config:done': ({ injectTypes }) => {
        injectTypes({ filename: 'virtual.d.ts', content: readFileSync(here('../virtual.d.ts'), 'utf8') });
      },
      'astro:server:setup': ({ server }) => {
        if (config.features.diagramDownload) {
          server.middlewares.use(diagramDevMiddleware({ base: server.config.base, root }));
        }
      },
      'astro:build:done': ({ dir, logger }) => {
        if (!config.features.diagramDownload) return;
        const copied = copyDiagramSources(dir, { root });
        logger.info(`图表源文件：复制 ${copied.length} 个到 diagrams/`);
      },
    },
  };
}
