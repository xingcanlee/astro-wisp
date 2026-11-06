/**
 * Excalidraw 导出：用 esbuild 把 @excalidraw/excalidraw 打成一个 IIFE（缓存在 ~/.cache/wisp-diagram），
 * 在 Playwright 页面里调用 exportToSvg / convertToExcalidrawElements。
 *
 * 为什么不用 import map：excalidraw 的 ESM 依赖树很深（react、roughjs、jotai…），逐个映射脆弱；
 * esbuild 一次打包、按版本缓存，后续导出无需再打包。
 *
 * 字体：页面里注册 Excalifont、Inter、Noto Sans SC，并把 Noto Sans SC 另注册为 "Xiaolai"
 * （Excalidraw 内置的 CJK 回退族），这样中文按 Noto SC 测量——与站点最终渲染一致（diagrams.md §3.4）。
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Page } from 'playwright';
import { type BrowserSession, ORIGIN, pageErrors, type WispPage } from './browser.ts';
import { cacheDir, importPackage, INSTALL_HINT, log, readPackageVersion, requirePackageDir, sha256 } from './env.ts';
import { fontFaceCss, type FontShard } from './fonts.ts';

const ENTRY = (indexPath: string) => `
import { exportToSvg, convertToExcalidrawElements, restore, FONT_FAMILY } from ${JSON.stringify(indexPath)};
window.__wisp = { exportToSvg, convertToExcalidrawElements, restore, FONT_FAMILY };
`;

interface EsbuildLike {
  build(opts: Record<string, unknown>): Promise<{ errors: unknown[] }>;
}

/** 返回打包后的 IIFE 路径；首次调用会打包（约数秒）。 */
export async function ensureExcalidrawBundle(): Promise<string> {
  const pkgDir = requirePackageDir('@excalidraw/excalidraw', INSTALL_HINT);
  const index = join(pkgDir, 'dist', 'prod', 'index.js');
  const entry = ENTRY(index);
  const version = readPackageVersion(pkgDir);
  const out = join(cacheDir(), `excalidraw-${version}-${sha256(entry).slice(0, 10)}.js`);
  if (existsSync(out)) return out;

  let esbuild: EsbuildLike;
  try {
    const m = await importPackage<EsbuildLike & { default?: EsbuildLike }>('esbuild', ['vite', 'astro', 'tsx']);
    esbuild = typeof m.build === 'function' ? m : m.default!;
  } catch {
    throw new Error(`[wisp-diagram] 需要 esbuild 来打包 Excalidraw。${INSTALL_HINT}`);
  }
  log(`打包 @excalidraw/excalidraw@${version}（仅首次）…`);
  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.${process.pid}.tmp`;
  await esbuild.build({
    stdin: { contents: entry, resolveDir: dirname(index), loader: 'js', sourcefile: 'wisp-excalidraw-entry.js' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    minify: true,
    outfile: tmp,
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.IS_PREACT': '"false"', 'import.meta.env': '{}' },
    loader: { '.css': 'empty', '.woff2': 'empty', '.ttf': 'empty', '.wasm': 'empty' },
    logLevel: 'error',
  });
  renameSync(tmp, out);
  return out;
}

/**
 * 页面级随机源固定：Math.random / crypto.getRandomValues 用种子化 PRNG；
 * Excalidraw 内部的 Random 在模块加载时以 Date.now() 为种子，所以加载期间冻结 Date.now。
 */
const DETERMINISM = (seed: number) => `
(() => {
  let s = ${seed | 0};
  const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = rnd;
  const orig = crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues = (arr) => { if (!arr || !arr.length) return orig(arr);
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(rnd() * 256); return arr; };
  const realNow = Date.now;
  Date.now = () => ${1_700_000_000_000 + (seed | 0)};
  window.__wispUnfreeze = () => { Date.now = realNow; };
})();
`;

function fontMounts(): { mounts: Record<string, string>; urlFor: (s: FontShard) => string } {
  const exc = join(requirePackageDir('@excalidraw/excalidraw', INSTALL_HINT), 'dist', 'prod');
  const inter = join(requirePackageDir('@fontsource-variable/inter', INSTALL_HINT), 'files');
  const noto = join(requirePackageDir('@fontsource-variable/noto-sans-sc', INSTALL_HINT), 'files');
  const urlFor = (s: FontShard) => {
    const sub = s.family === 'Excalifont' ? 'excalifont' : s.family === 'Inter' ? 'inter' : 'noto-sc';
    return `${ORIGIN}/fonts/${sub}/${basename(s.file)}`;
  };
  return {
    mounts: {
      '/excalidraw-assets/': exc,
      '/fonts/excalifont/': join(exc, 'fonts', 'Excalifont'),
      '/fonts/inter/': inter,
      '/fonts/noto-sc/': noto,
    },
    urlFor,
  };
}

/** 打开一个已加载 Excalidraw 打包产物与字体的页面。 */
export async function openExcalidrawPage(session: BrowserSession, seed = 1): Promise<WispPage> {
  const bundle = await ensureExcalidrawBundle();
  const { mounts, urlFor } = fontMounts();
  const css = fontFaceCss(['Excalifont', 'Inter', 'Noto Sans SC'], urlFor, { 'Noto Sans SC': ['Xiaolai'] });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body></body></html>`;
  const wp = await session.openPage({
    html,
    mounts: { ...mounts, '/bundle/': dirname(bundle) },
    initScript: `window.EXCALIDRAW_ASSET_PATH=${JSON.stringify(`${ORIGIN}/excalidraw-assets/`)};${DETERMINISM(seed)}`,
  });
  await wp.page.addScriptTag({ url: `${ORIGIN}/bundle/${basename(bundle)}` });
  const ok = await wp.page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__wispUnfreeze?.();
    return typeof w.__wisp === 'object';
  });
  if (!ok) throw new Error(`[wisp-diagram] Excalidraw 打包产物加载失败：${pageErrors(wp.page).join('; ')}`);
  return wp;
}

const pages = new WeakMap<BrowserSession, Promise<Page>>();

/** 导出用：每个会话复用一个页面（exportToSvg 只读元素数据，不消耗随机数）。 */
export function excalidrawPage(session: BrowserSession): Promise<Page> {
  let p = pages.get(session);
  if (!p) {
    p = openExcalidrawPage(session).then((wp) => wp.page);
    pages.set(session, p);
  }
  return p;
}

export interface ExcalidrawExportOptions {
  /** 画布四周留白（px），默认 8（与网格一致） */
  padding?: number;
}

/** .excalidraw 场景 JSON → Excalidraw 原生 SVG 字符串（未做可移植处理）。 */
export async function exportExcalidrawSvg(session: BrowserSession, sceneJson: string, opts: ExcalidrawExportOptions = {}): Promise<string> {
  const page = await excalidrawPage(session);
  const padding = opts.padding ?? 8;
  return page.evaluate(async ({ sceneJson, padding }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = (window as any).__wisp;
    const data = JSON.parse(sceneJson);
    const restored = w.restore(data, null, null);
    const elements = restored.elements.filter((e: { isDeleted?: boolean }) => !e.isDeleted);
    const svg: SVGSVGElement = await w.exportToSvg({
      elements,
      appState: { ...restored.appState, exportBackground: false, exportWithDarkMode: false, exportEmbedScene: false },
      files: restored.files ?? data.files ?? {},
      exportPadding: padding,
      skipInliningFonts: true,
    });
    return new XMLSerializer().serializeToString(svg);
  }, { sceneJson, padding });
}

/** ExcalidrawElementSkeleton[] → 完整元素（在浏览器中运行 convertToExcalidrawElements，按需加载字体以便测量）。 */
export async function convertSkeletonInBrowser(session: BrowserSession, skeleton: unknown[], seed = 1): Promise<unknown[]> {
  // 每次转换用新页面，保证结果只取决于骨架和 seed
  const { page, close } = await openExcalidrawPage(session, seed);
  try {
    return await page.evaluate(async ({ skeleton }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const text = JSON.stringify(skeleton).replace(/[{}[\]":,]/g, ' ');
      await Promise.all(['Excalifont', 'Xiaolai', 'Inter', 'Noto Sans SC'].map((f) => document.fonts.load(`16px "${f}"`, text)));
      await document.fonts.ready;
      return w.__wisp.convertToExcalidrawElements(skeleton, { regenerateIds: false });
    }, { skeleton });
  } finally {
    await close();
  }
}
