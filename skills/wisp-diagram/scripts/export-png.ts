#!/usr/bin/env -S npx tsx
/**
 * 导出 PNG（公众号、知乎等不支持 SVG 的平台；也用于 Agent 自检预览）。
 *
 *   npx tsx export-png.ts <file.wisp.svg | file.excalidraw | file.drawio> [--theme light|dark] [--scale 2]
 *                         [-o out.png] [--transparent] [--no-embed-fonts]
 *
 * 渲染方式：把 SVG 内联进 Playwright 页面，用 emulateMedia(colorScheme) 触发 SVG 内置的
 * prefers-color-scheme 分支，所以 PNG 与“作为 <img> 时随系统主题切换”的效果一致。
 * 默认嵌入字体子集（与运行环境装了哪些字体无关）；背景取调色板 base.bg 的对应主题值。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserSession } from './exporters/browser.ts';
import { SKILL_DIR } from './exporters/env.ts';
import { embedFonts } from './exporters/fonts.ts';
import { buildDiagram } from './build.ts';

export type Theme = 'light' | 'dark';

export interface PngOptions {
  theme?: Theme;
  scale?: number;
  transparent?: boolean;
  embedFonts?: boolean;
  session?: BrowserSession;
}

function themeBackground(theme: Theme): string {
  const p = JSON.parse(readFileSync(join(SKILL_DIR, 'palette.json'), 'utf8')) as { color: { base: { bg: Record<Theme, string> } } };
  return p.color.base.bg[theme];
}

/** 已生成的 .wisp.svg 字符串 → PNG Buffer。 */
export async function svgToPng(svg: string, opts: PngOptions = {}): Promise<Buffer> {
  const theme = opts.theme ?? 'light';
  const scale = opts.scale ?? 2;
  let content = svg;
  if ((opts.embedFonts ?? true) && !/data-wisp-fonts/.test(content)) content = (await embedFonts(content)).svg;
  const own = !opts.session;
  const session = opts.session ?? new BrowserSession();
  try {
    const bg = opts.transparent ? 'transparent' : themeBackground(theme);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:${bg}}
      #wrap{display:inline-block;padding:16px;background:${bg}}
      #wrap>svg{display:block}
    </style></head><body><div id="wrap">${content.replace(/<\?xml[^>]*>/, '')}</div></body></html>`;
    const { page, close } = await session.openPage({ html, colorScheme: theme, deviceScaleFactor: scale });
    try {
      await page.emulateMedia({ colorScheme: theme });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const el = await page.$('#wrap');
      if (!el) throw new Error('[wisp-diagram] 渲染失败：找不到 SVG');
      return await el.screenshot({ omitBackground: !!opts.transparent, type: 'png' });
    } finally {
      await close();
    }
  } finally {
    if (own) await session.close();
  }
}

export interface PngResult { path: string; bytes: number }

/** 文件 → PNG。输入为源文件时先在内存中构建（不写 .wisp.svg）。 */
export async function exportPng(file: string, out: string | undefined, opts: PngOptions = {}): Promise<PngResult[]> {
  const abs = resolve(file);
  const theme = opts.theme ?? 'light';
  const own = !opts.session;
  const session = opts.session ?? new BrowserSession();
  try {
    let svgs: Array<{ name: string; svg: string }>;
    if (/\.(excalidraw|drawio)$/i.test(abs)) {
      const r = await buildDiagram(abs, { session, write: false, embedFonts: opts.embedFonts ?? true });
      svgs = r.outputs.map((o) => ({ name: basename(o.path).replace(/\.wisp\.svg$/, ''), svg: o.svg }));
    } else {
      svgs = [{ name: basename(abs).replace(/(\.wisp)?\.svg$/i, ''), svg: readFileSync(abs, 'utf8') }];
    }
    const results: PngResult[] = [];
    for (const [i, s] of svgs.entries()) {
      const png = await svgToPng(s.svg, { ...opts, session });
      const dest = out && svgs.length === 1 ? resolve(out)
        : out ? resolve(out).replace(/\.png$/i, '') + (i === 0 ? '' : `.${i + 1}`) + '.png'
        : join(dirname(abs), `${s.name}.${theme}.png`);
      writeFileSync(dest, png);
      results.push({ path: dest, bytes: png.length });
    }
    return results;
  } finally {
    if (own) await session.close();
  }
}

const USAGE = '用法：export-png <file.wisp.svg|.excalidraw|.drawio> [--theme light|dark] [--scale 2] [-o out.png] [--transparent] [--no-embed-fonts]\n';

async function main(argv: string[]): Promise<number> {
  const args = [...argv];
  const opts: PngOptions = {};
  let out: string | undefined;
  const files: string[] = [];
  while (args.length) {
    const a = args.shift()!;
    if (a === '--theme') {
      const t = args.shift();
      if (t !== 'light' && t !== 'dark') { process.stderr.write('--theme 只能是 light 或 dark\n'); return 2; }
      opts.theme = t;
    } else if (a === '--scale') opts.scale = Number(args.shift());
    else if (a === '-o' || a === '--out') out = args.shift();
    else if (a === '--transparent') opts.transparent = true;
    else if (a === '--no-embed-fonts') opts.embedFonts = false;
    else if (a === '--png') { /* 兼容 `export --png` 写法 */ }
    else if (a === '-h' || a === '--help') { process.stdout.write(USAGE); return 0; }
    else files.push(a);
  }
  if (files.length !== 1) { process.stderr.write(USAGE); return 2; }
  if (opts.scale !== undefined && !(opts.scale > 0 && opts.scale <= 8)) { process.stderr.write('--scale 需在 (0, 8] 之间\n'); return 2; }
  for (const r of await exportPng(files[0]!, out, opts)) process.stdout.write(`${r.path} (${(r.bytes / 1024).toFixed(1)} KB)\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e: Error) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}
