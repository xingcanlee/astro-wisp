import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import wisp, { OVERRIDABLE_COMPONENTS, OVERRIDABLE_LAYOUTS } from './integration';
import { defineWispConfig } from './config';

/** 用假的钩子参数跑 astro:config:setup，收集注入的路由与配置更新。 */
function setup(input: Parameters<typeof wisp>[0] = {}, base = '/') {
  const root = mkdtempSync(join(tmpdir(), 'wisp-int-'));
  const codegen = join(root, '.astro', 'integrations', 'astro-wisp');
  const routes: string[] = [];
  const updates: any[] = [];
  const warnings: string[] = [];
  const hook = wisp(input).hooks['astro:config:setup'] as (p: any) => void;
  hook({
    config: { root: pathToFileURL(`${root}/`), integrations: [], site: new URL('https://example.com'), base },
    updateConfig: (u: unknown) => updates.push(u),
    injectRoute: (r: { pattern: string }) => routes.push(r.pattern),
    command: 'build',
    logger: { warn: (m: string) => warnings.push(m), info() {} },
    createCodegenDir: () => pathToFileURL(`${codegen}/`),
    addWatchFile() {},
  });
  const vite = updates[0].vite;
  const plugin = vite.plugins.find((p: any) => p.name === 'astro-wisp:virtual');
  const load = (id: string) => plugin.load(plugin.resolveId(id));
  return { root, routes, updates, warnings, load, codegen };
}

describe('astro-wisp 集成', () => {
  it('默认注入全部路由，并注册 MDX 与 Sitemap', () => {
    const { routes, updates } = setup();
    expect(routes).toEqual(expect.arrayContaining(['/', '/page/[page]', '/posts/[...id]', '/archive', '/tags', '/tags/[tag]', '/categories', '/categories/[cat]', '/about', '/rss.xml', '/404']));
    expect(updates[0].integrations.map((i: { name: string }) => i.name)).toEqual(['@astrojs/mdx', '@astrojs/sitemap']);
    expect(updates[0].fonts.map((f: { cssVariable: string }) => f.cssVariable)).toEqual(['--font-wisp-sans', '--font-wisp-mono', '--font-wisp-hand']);
  });

  it('routes 开关可以关闭单个路由，便于站点自行实现', () => {
    const { routes } = setup({ routes: { about: false, rss: false } });
    expect(routes).not.toContain('/about');
    expect(routes).not.toContain('/rss.xml');
    expect(routes).toContain('/archive');
  });

  it('components 覆盖：虚拟模块指向站点文件；未知组件名报错并列出可选项', () => {
    const { load, root } = setup({ components: { Footer: './src/components/MyFooter.astro' } });
    expect(load('virtual:wisp/components/Footer')).toContain(JSON.stringify(join(root, 'src/components/MyFooter.astro')));
    expect(load('virtual:wisp/components/Header').replaceAll('\\\\', '/')).toMatch(/components\/Header\.astro"/);
    expect(load('virtual:wisp/components/Post').replaceAll('\\\\', '/')).toMatch(/layouts\/Post\.astro"/);
    expect(() => setup({ components: { Nope: './x.astro' } })).toThrow(/未知的组件名：Nope。可覆盖：.*Footer/);
  });

  it('运行时配置：不含构建期选项；客户端 locale 只暴露语言', () => {
    const { load, root } = setup({ site: { title: 'T', lang: 'en' }, customCss: ['./a.css', 'pkg/b.css'] });
    const cfg = JSON.parse(load('virtual:wisp/config').replace(/^export default |;$/g, ''));
    expect(cfg).toMatchObject({ base: '/', siteUrl: 'https://example.com/', site: { title: 'T', lang: 'en' } });
    expect(join(cfg.root)).toBe(join(root, '/'));
    expect(cfg).not.toHaveProperty('components');
    expect(cfg).not.toHaveProperty('customCss');
    expect(load('virtual:wisp/locale')).toBe('export const lang = "en";');
    expect(load('virtual:wisp/user-css')).toBe(`import ${JSON.stringify(join(root, 'a.css'))};\nimport "pkg/b.css";`);
  });

  it('运行时配置保留 Astro base，供主题链接使用', () => {
    const cfg = JSON.parse(setup({}, '/infra-note/').load('virtual:wisp/config').replace(/^export default |;$/g, ''));
    expect(cfg.base).toBe('/infra-note/');
  });

  it('palette 覆盖：生成到 codegen 目录并替换主题令牌；对比度不足时告警', () => {
    const { load, codegen, warnings } = setup({ palette: { color: { base: { accent: { light: '#eeeeee', dark: '#5ad19a' } } } } });
    const file = join(codegen, 'theme.css');
    expect(load('virtual:wisp/theme-css')).toBe(`import ${JSON.stringify(file)};`);
    const css = readFileSync(file, 'utf8');
    expect(css).toContain('--wisp-accent: #eeeeee;');
    expect(css).toContain('--pele-accent: var(--wisp-accent);');
    expect(css).toContain('[data-theme] .wisp-d');
    expect(warnings.some((w) => w.includes('accent / bg'))).toBe(true);
  });

  it('没有覆盖调色板时直接使用包内提交的令牌文件', () => {
    expect(setup().load('virtual:wisp/theme-css').replaceAll('\\\\', '/')).toMatch(/styles\/tokens\.css";\nimport .*styles\/pele\.css";\nimport .*styles\/diagram\.css";$/);
  });

  it('virtual.d.ts 为每个可覆盖组件声明了类型', () => {
    const dts = readFileSync(new URL('../virtual.d.ts', import.meta.url), 'utf8');
    for (const n of [...OVERRIDABLE_COMPONENTS, ...OVERRIDABLE_LAYOUTS]) {
      expect(dts, n).toContain(`declare module 'virtual:wisp/components/${n}'`);
    }
  });

  it('配置默认值', () => {
    const c = defineWispConfig();
    expect(c.routes).toEqual({ home: true, posts: true, archive: true, tags: true, categories: true, about: true, rss: true, notFound: true });
    expect(c.components).toEqual({});
    expect(c.customCss).toEqual([]);
    expect(c.palette).toBeUndefined();
    expect(() => defineWispConfig({ routes: { about: 'no' as never } })).toThrow(/routes\.about/);
  });
});
