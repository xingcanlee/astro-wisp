/**
 * 字体：Excalifont（取自 @excalidraw/excalidraw 的 dist）、Inter、Noto Sans SC（取自 @fontsource-variable）。
 * - 浏览器导出页用 fontFaceCss() 注册字体，保证文本测量与最终渲染一致；
 * - --embed-fonts 用 embedFonts() 按图中实际字符裁剪子集，以 base64 woff2 写入 <style>。
 *
 * 族名与 lib/palette.ts 的 fontStack() 一致（去掉 " Variable" 后缀）：Inter、"Noto Sans SC"、Excalifont。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importPackage, INSTALL_HINT, requirePackageDir } from './env.ts';

export type FontFamily = 'Excalifont' | 'Inter' | 'Noto Sans SC';

export interface FontShard {
  family: FontFamily;
  file: string;
  /** CSS unicode-range 原文 */
  unicodeRange: string;
  ranges: Array<[number, number]>;
  /** 可变字体的字重范围，如 "100 900"；静态字体为 undefined */
  weight?: string;
}

export function parseUnicodeRange(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const part of text.split(',')) {
    const t = part.trim().replace(/^U\+/i, '');
    if (!t) continue;
    if (t.includes('?')) {
      out.push([parseInt(t.replace(/\?/g, '0'), 16), parseInt(t.replace(/\?/g, 'f'), 16)]);
    } else if (t.includes('-')) {
      const [a, b] = t.split('-');
      out.push([parseInt(a!, 16), parseInt(b!.replace(/^U\+/i, ''), 16)]);
    } else {
      const n = parseInt(t, 16);
      out.push([n, n]);
    }
  }
  return out;
}

export const inRanges = (cp: number, ranges: Array<[number, number]>) => ranges.some(([a, b]) => cp >= a && cp <= b);

/** 解析 fontsource 的 index.css（只取 normal 样式）。 */
function fontsourceShards(pkg: string, family: FontFamily): FontShard[] {
  const dir = requirePackageDir(pkg, INSTALL_HINT);
  const css = readFileSync(join(dir, 'index.css'), 'utf8');
  const shards: FontShard[] = [];
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
    if (!/font-style:\s*normal/.test(block)) continue;
    const url = /url\(\.\/([^)]+)\)/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    const weight = /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim();
    if (!url || !range) continue;
    shards.push({ family, file: join(dir, url), unicodeRange: range, ranges: parseUnicodeRange(range), weight });
  }
  return shards;
}

/**
 * Excalifont 在 Excalidraw 中按 unicode-range 分片。range 只写在 dist 的 JS 里，
 * 这里用正则从打包产物中取出；取不到时退化为“首个分片覆盖 Latin 基本区”。
 */
function excalifontShards(): FontShard[] {
  const dir = join(requirePackageDir('@excalidraw/excalidraw', INSTALL_HINT), 'dist', 'prod');
  const fontDir = join(dir, 'fonts', 'Excalifont');
  const files = readdirSync(fontDir).filter((f) => f.endsWith('.woff2')).sort();
  const shards: FontShard[] = [];
  for (const js of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const src = readFileSync(join(dir, js), 'utf8');
    if (!src.includes('fonts/Excalifont/')) continue;
    const vars = new Map<string, string>();
    for (const m of src.matchAll(/(?:var|let|const)\s+([\w$]+)\s*=\s*"\.\/fonts\/Excalifont\/([^"]+)"/g)) vars.set(m[1]!, m[2]!);
    for (const m of src.matchAll(/\{\s*uri:\s*([\w$]+)\s*,\s*descriptors:\s*\{\s*unicodeRange:\s*"([^"]+)"/g)) {
      const file = vars.get(m[1]!);
      if (file) shards.push({ family: 'Excalifont', file: join(fontDir, file), unicodeRange: m[2]!, ranges: parseUnicodeRange(m[2]!) });
    }
  }
  if (shards.length) return shards;
  const basic = 'U+20-7E';
  return files.slice(0, 1).map((f) => ({ family: 'Excalifont' as const, file: join(fontDir, f), unicodeRange: basic, ranges: parseUnicodeRange(basic) }));
}

const cache = new Map<FontFamily, FontShard[]>();
export function shardsFor(family: FontFamily): FontShard[] {
  let s = cache.get(family);
  if (!s) {
    s = family === 'Excalifont' ? excalifontShards()
      : family === 'Inter' ? fontsourceShards('@fontsource-variable/inter', 'Inter')
      : fontsourceShards('@fontsource-variable/noto-sans-sc', 'Noto Sans SC');
    cache.set(family, s);
  }
  return s;
}

function faceRule(family: string, src: string, s: FontShard, range = s.unicodeRange): string {
  const w = s.weight ? `font-weight:${s.weight};` : '';
  return `@font-face{font-family:"${family}";font-style:normal;${w}font-display:block;src:${src};unicode-range:${range}}`;
}

/**
 * 浏览器页面用的 @font-face。`aliases` 可把同一组文件再注册成别的族名
 * （例如把 Noto Sans SC 注册成 Excalidraw 的 CJK 回退族 Xiaolai，使中文测量按 Noto SC 进行）。
 */
export function fontFaceCss(families: FontFamily[], urlFor: (s: FontShard) => string, aliases: Partial<Record<FontFamily, string[]>> = {}): string {
  const rules: string[] = [];
  for (const f of families) {
    for (const s of shardsFor(f)) {
      for (const name of [f, ...(aliases[f] ?? [])]) rules.push(faceRule(name, `url(${urlFor(s)}) format("woff2")`, s));
    }
  }
  return rules.join('\n');
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITY[e] ?? m;
  });
}

/** 收集 SVG 中所有可见文本字符（<text>、<foreignObject> 内的 HTML、<title>/<desc> 不计）。 */
export function collectSvgText(svg: string): string {
  const body = svg
    .replace(/<style\b[\s\S]*?<\/style>/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<(title|desc|metadata)\b[\s\S]*?<\/\1>/g, '');
  let text = '';
  for (const m of body.matchAll(/>([^<]+)</g)) text += decodeEntities(m[1]!);
  return [...new Set(text.replace(/\s+/g, ' '))].join('');
}

export interface EmbedResult { svg: string; bytes: number; families: FontFamily[] }

type SubsetFont = (buf: Buffer, text: string, opts?: { targetFormat?: 'woff2' | 'woff' | 'truetype' | 'sfnt' }) => Promise<Buffer>;

/**
 * 按图中字符裁剪字体并内嵌。family 由 SVG 中使用的字体变量决定：
 * --wd-font-hand → Excalifont + Noto Sans SC；--wd-font-sans（或无变量）→ Inter + Noto Sans SC。
 */
export async function embedFonts(svg: string): Promise<EmbedResult> {
  const subsetMod = await importPackage<{ default: SubsetFont }>('subset-font');
  const subset = subsetMod.default;
  const stripped = svg.replace(/<style\b[^>]*data-wisp-fonts[^>]*>[\s\S]*?<\/style>/g, '');
  const usesHand = /--wd-font-hand/.test(stripped.replace(/<style\b[\s\S]*?<\/style>/g, ''));
  const usesSans = /--wd-font-sans/.test(stripped.replace(/<style\b[\s\S]*?<\/style>/g, '')) || !usesHand;
  const families: FontFamily[] = [];
  if (usesHand) families.push('Excalifont');
  if (usesSans) families.push('Inter');
  families.push('Noto Sans SC');

  const chars = [...collectSvgText(stripped)].filter((c) => c.trim() !== '');
  const rules: string[] = [];
  let bytes = 0;
  for (const fam of families) {
    for (const s of shardsFor(fam)) {
      const mine = chars.filter((c) => inRanges(c.codePointAt(0)!, s.ranges));
      if (!mine.length) continue;
      const out = await subset(readFileSync(s.file), mine.join(''), { targetFormat: 'woff2' });
      bytes += out.length;
      rules.push(faceRule(fam, `url(data:font/woff2;base64,${out.toString('base64')}) format("woff2")`, s));
    }
  }
  if (!rules.length) return { svg: stripped, bytes: 0, families };
  const style = `<style data-wisp-fonts="1">${rules.join('')}</style>`;
  return { svg: stripped.replace(/<svg\b[^>]*>/, (open) => open + style), bytes, families };
}

export const _test = { decodeEntities };
