/**
 * 把导出的 SVG 转成可移植 SVG（docs/diagrams.md §3）：
 * 颜色 → var(--wd-x, fallback)，去背景矩形，注入作用域化 <style>，统一 font-family。
 */
import { exactToken, isWhite, nearestToken, parseColor, wdStyleCss, TOKENS } from './palette.ts';

export interface PortableSvgOptions { style?: 'hand' | 'clean'; fix?: boolean }
export interface PortableSvgResult { svg: string; warnings: string[]; unknownColors: string[] }

const COLOR_PROPS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];
const COLOR_PROP_RE = COLOR_PROPS.join('|');
const NAMED = 'black|white|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|cyan|magenta';
const COLOR_IN_TEXT = new RegExp(
  `#[0-9a-fA-F]{8}\\b|#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{3,4}\\b|(?:rgba?|hsla?)\\([^)]*\\)`, 'g');
const KEEP = /^(none|transparent|currentcolor|inherit|initial|unset)$/i;

const BG_VAR = TOKENS.find((t) => t.name === 'bg')!;

interface Ctx { fix: boolean; warnings: string[]; unknown: Set<string>; snapped: Set<string> }

const varRef = (cssVar: string, fallback: string) => `var(${cssVar}, ${fallback})`;

/** 映射单个颜色字面量；返回 null 表示保持原样。 */
function mapOne(raw: string, ctx: Ctx): string | null {
  const v = raw.trim();
  if (KEEP.test(v) || v.startsWith('var(') || v.startsWith('url(')) return null;
  const parsed = parseColor(v);
  if (!parsed) return null;
  if (parsed.alpha === 0) return null; // 完全透明，等价 none
  if (parsed.alpha < 1) {
    ctx.unknown.add(v.toLowerCase());
    return null;
  }
  if (isWhite(parsed.hex)) return varRef(BG_VAR.cssVar, BG_VAR.light);
  const exact = exactToken(parsed.hex);
  if (exact) return varRef(exact.cssVar, exact.light);
  if (ctx.fix) {
    const { token, deltaE } = nearestToken(parsed.hex);
    ctx.snapped.add(`${parsed.hex} -> ${token.cssVar} (ΔE ${deltaE.toFixed(1)})`);
    return varRef(token.cssVar, token.light);
  }
  ctx.unknown.add(parsed.hex);
  return null;
}

/** 映射一个属性/声明值，里面可能含多个颜色（渐变、drop-shadow 等）。 */
function mapValue(value: string, ctx: Ctx): string {
  if (value.includes('var(')) return value;
  const whole = mapOne(value, ctx);
  if (whole) return whole;
  if (!COLOR_IN_TEXT.test(value)) {
    COLOR_IN_TEXT.lastIndex = 0;
    return value;
  }
  COLOR_IN_TEXT.lastIndex = 0;
  return value.replace(COLOR_IN_TEXT, (m) => mapOne(m, ctx) ?? m);
}

function fontVar(value: string): string {
  const v = value.toLowerCase();
  if (v.includes('var(')) return value;
  if (/virgil|excalifont|excalidraw|segoe print|comic/.test(v)) return 'var(--wd-font-hand)';
  if (/cascadia|mono|courier|consolas|menlo/.test(v)) return 'var(--wd-font-mono)';
  return 'var(--wd-font-sans)';
}

/** 处理 CSS 声明（style 属性或 <style> 内容）中的颜色与 font-family。 */
function mapDeclarations(css: string, ctx: Ctx): string {
  const re = new RegExp(`(^|[;{\\s])(${COLOR_PROP_RE}|background|background-color|border-color|outline-color|filter|font-family)(\\s*:\\s*)([^;}]+)`, 'gi');
  return css.replace(re, (_m, pre: string, prop: string, sep: string, val: string) => {
    const p = prop.toLowerCase();
    if (p === 'font-family') return `${pre}${prop}${sep}${fontVar(val.trim())}`;
    return `${pre}${prop}${sep}${mapValue(val.trim(), ctx)}`;
  });
}

/** <style> 内容：@font-face 块原样保留。 */
function mapStyleContent(css: string, ctx: Ctx): string {
  const parts = css.split(/(@font-face\s*\{[^}]*\})/gi);
  return parts.map((p) => (/^@font-face/i.test(p) ? p : mapDeclarations(p, ctx))).join('');
}

function parseNum(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** 删除覆盖整个画布的白色/画布色背景 <rect>，只删第一个。 */
function removeBackground(svg: string, warnings: string[]): string {
  const rootTag = /<svg\b[^>]*>/.exec(svg)?.[0] ?? '';
  const vb = attr(rootTag, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
  const rectRe = /<rect\b[^>]*?(?:\/>|>\s*<\/rect>)/g;
  let removed = false;
  const out = svg.replace(rectRe, (tag) => {
    if (removed) return tag;
    const fillRaw = attr(tag, 'fill') ?? /style="[^"]*\bfill\s*:\s*([^;"]+)/.exec(tag)?.[1];
    if (!fillRaw) return tag;
    const f = fillRaw.trim();
    const isBg = isWhite(f) || /^var\(--wd-bg/.test(f) || parseColor(f)?.hex === BG_VAR.light;
    if (!isBg) return tag;
    const w = attr(tag, 'width');
    const h = attr(tag, 'height');
    const x = parseNum(attr(tag, 'x')) ?? 0;
    const y = parseNum(attr(tag, 'y')) ?? 0;
    let covers: boolean;
    if (w === '100%' && h === '100%') covers = true;
    else if (vb && vb.length === 4 && vb.every(Number.isFinite)) {
      const [vx, vy, vw, vh] = vb as [number, number, number, number];
      covers = x <= vx + 1 && y <= vy + 1 && (parseNum(w) ?? 0) >= vw - 2 && (parseNum(h) ?? 0) >= vh - 2;
    } else covers = false;
    if (!covers) return tag;
    removed = true;
    return '';
  });
  if (removed) warnings.push('removed background rect');
  return out;
}

function patchRoot(svg: string, warnings: string[]): string {
  return svg.replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
    let a = attrs;
    // 根元素上的 background 样式
    a = a.replace(/\sstyle="([^"]*)"/, (_s, st: string) => {
      const kept = st.split(';').filter((d) => d.trim() && !/^\s*(background(?:-color)?|color-scheme)\s*:/i.test(d));
      return kept.length ? ` style="${kept.join(';')}"` : '';
    });
    if (/\sclass="/.test(a)) {
      a = a.replace(/\sclass="([^"]*)"/, (_c, cls: string) =>
        /(^|\s)wisp-d(\s|$)/.test(cls) ? ` class="${cls}"` : ` class="${cls} wisp-d"`);
    } else a += ' class="wisp-d"';
    if (!/\sxmlns="/.test(a)) {
      a += ' xmlns="http://www.w3.org/2000/svg"';
      warnings.push('added missing xmlns');
    }
    return `<svg${a}>`;
  });
}

/** 把匹配的块换成占位符，返回还原函数。 */
function protect(svg: string, re: RegExp): { svg: string; restore: (s: string) => string } {
  const saved: string[] = [];
  const out = svg.replace(re, (m) => `<!--wd-protect-${saved.push(m) - 1}-->`);
  return { svg: out, restore: (s) => s.replace(/<!--wd-protect-(\d+)-->/g, (_m, i: string) => saved[+i]!) };
}

/**
 * 转成可移植 SVG。`<mask>`、`<clipPath>`、`<pattern>` 内部原样保留（里面的黑白是遮罩
 * 语义，不是配色）；背景矩形只在 `<defs>` 之外的顶层删除。
 */
export function toPortableSvg(rawSvg: string, opts: PortableSvgOptions = {}): PortableSvgResult {
  const ctx: Ctx = { fix: !!opts.fix, warnings: [], unknown: new Set(), snapped: new Set() };
  let svg = rawSvg;

  // 重跑幂等：先去掉上一次注入的 <style>
  svg = svg.replace(/<style\b[^>]*data-wisp-vars[^>]*>[\s\S]*?<\/style>/g, '');

  const masks = protect(svg, /<(mask|clipPath|pattern)\b[^>]*>[\s\S]*?<\/\1>/g);
  svg = masks.svg;

  const defs = protect(svg, /<defs\b[^>]*>[\s\S]*?<\/defs>/g);
  svg = removeBackground(defs.svg, ctx.warnings);
  svg = defs.restore(svg);
  svg = patchRoot(svg, ctx.warnings);

  // <style> 内容
  svg = svg.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, o: string, c: string, e: string) =>
    `${o}${mapStyleContent(c, ctx)}${e}`);

  // style="..." 属性
  svg = svg.replace(/(\sstyle=")([^"]*)(")/g, (_m, a: string, v: string, z: string) => `${a}${mapDeclarations(v, ctx)}${z}`);

  // 展示属性
  svg = svg.replace(new RegExp(`(\\s(?:${COLOR_PROP_RE})=")([^"]*)(")`, 'g'),
    (_m, a: string, v: string, z: string) => `${a}${mapValue(v, ctx)}${z}`);
  svg = svg.replace(/(\sfont-family=")([^"]*)(")/g, (_m, a: string, v: string, z: string) => `${a}${fontVar(v)}${z}`);

  const styleEl = `<style data-wisp-vars="1">${wdStyleCss()}</style>`;
  svg = svg.replace(/<svg\b[^>]*>/, (open) => `${open}${styleEl}`);

  svg = masks.restore(svg);

  for (const s of ctx.snapped) ctx.warnings.push(`snapped ${s}`);
  const unknownColors = [...ctx.unknown].sort();
  for (const u of unknownColors) ctx.warnings.push(`unknown color ${u} left unchanged`);
  if (opts.style && !/data-style=/.test(svg)) {
    svg = svg.replace(/<svg\b/, `<svg data-style="${opts.style}"`);
  }
  return { svg, warnings: ctx.warnings, unknownColors };
}
