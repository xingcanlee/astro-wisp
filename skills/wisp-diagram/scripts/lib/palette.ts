/**
 * Skill 内部的 palette 工具。只依赖 skills/wisp-diagram/palette.json 和 culori，
 * 不引用 skill 目录之外的文件，因此整个 skill 可独立复制。
 */
import { readFileSync } from 'node:fs';
import { differenceCiede2000, formatHex, parse } from 'culori';

export type Mode = 'light' | 'dark';
export interface Pair { light: string; dark: string }
export interface Palette {
  color: {
    base: Record<string, Pair>;
    hue: Record<string, { stroke: Pair; fill: Pair }>;
    semantic: Record<string, string>;
  };
  font: { sans: string[]; mono: string[]; hand: string[] };
  diagram: {
    'font-size-px': Record<string, number>;
    'grid-px': number;
  };
}

const PALETTE_URL = new URL('../../palette.json', import.meta.url);
export const palette: Palette = JSON.parse(readFileSync(PALETTE_URL, 'utf8'));

export const HUES = Object.keys(palette.color.hue).filter((k) => !k.startsWith('$'));

/** 进入 --wd-* 变量表的 base 令牌（accent-fg、code-bg、selection 不属于图表）。 */
const WD_BASE = ['bg', 'surface', 'surface-2', 'border', 'fg', 'muted', 'subtle', 'accent'] as const;

export interface Token {
  /** 令牌名，如 fg、blue、blue-fill */
  name: string;
  /** CSS 变量名，如 --wd-blue-fill */
  cssVar: string;
  light: string;
  dark: string;
}

function buildTokens(): Token[] {
  const out: Token[] = [];
  for (const h of HUES) {
    const { stroke, fill } = palette.color.hue[h]!;
    out.push({ name: h, cssVar: `--wd-${h}`, ...norm(stroke) });
    out.push({ name: `${h}-fill`, cssVar: `--wd-${h}-fill`, ...norm(fill) });
  }
  for (const b of WD_BASE) {
    const p = palette.color.base[b];
    if (p) out.push({ name: b, cssVar: `--wd-${b}`, ...norm(p) });
  }
  return out;
}
const norm = (p: Pair): Pair => ({ light: normalizeHex(p.light)!, dark: normalizeHex(p.dark)! });

/** 全部图表令牌。hue 在前，所以 accent 与 teal 同色时优先匹配 teal。 */
export const TOKENS: Token[] = buildTokens();

/** 额外别名：这些十六进制写法一律视为 fg（Excalidraw 默认黑等）。 */
export const FG_ALIASES = ['#000000', '#1e1e1e', '#1d1d1f'];

export interface ParsedColor { hex: string; alpha: number }

/** 解析任意 CSS 颜色（hex3/4/6/8、rgb()、hsl()、颜色名），失败返回 null。 */
export function parseColor(input: string): ParsedColor | null {
  const c = parse(input.trim());
  if (!c) return null;
  const hex = formatHex(c);
  if (!hex) return null;
  return { hex: hex.toLowerCase(), alpha: c.alpha ?? 1 };
}

/** 规范化为 6 位小写 hex；不是颜色或带透明度时返回 null。 */
export function normalizeHex(input: string): string | null {
  const p = parseColor(input);
  return p ? p.hex : null;
}

/** 按 light 值精确匹配令牌；fg 别名归到 fg。 */
export function exactToken(hex: string): Token | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  if (FG_ALIASES.includes(h)) return TOKENS.find((t) => t.name === 'fg')!;
  return TOKENS.find((t) => t.light === h) ?? null;
}

export function isWhite(input: string): boolean {
  return normalizeHex(input) === '#ffffff';
}

const de = differenceCiede2000();

export interface Nearest { token: Token; deltaE: number }

/** 在全部令牌的 light 值中找 ΔE2000 最近者。 */
export function nearestToken(hex: string): Nearest {
  const target = parse(hex);
  if (!target) throw new Error(`Not a color: ${hex}`);
  let best: Nearest | null = null;
  for (const token of TOKENS) {
    const d = de(target, parse(token.light)!);
    if (!best || d < best.deltaE) best = { token, deltaE: d };
  }
  return best!;
}

export interface ResolvedColor {
  hue: string;
  stroke: Pair;
  fill: Pair;
}

/** 解析 hue 名或语义名（q、k、v、weight…）。未知返回 null。 */
export function resolveColor(name: string): ResolvedColor | null {
  if (name.startsWith('$')) return null;
  const hue = palette.color.hue[name] ? name : palette.color.semantic[name];
  const h = hue ? palette.color.hue[hue] : undefined;
  if (!hue || !h) return null;
  return { hue, stroke: h.stroke, fill: h.fill };
}

function quoteFont(f: string): string {
  const name = f.replace(/ Variable$/, '');
  return /\s/.test(name) ? `"${name}"` : name;
}

/** 字体栈。去掉 " Variable" 后缀（站点外没有这些可变字体名）并去重。 */
export function fontStack(kind: 'sans' | 'mono' | 'hand'): string {
  return [...new Set(palette.font[kind].map(quoteFont))].join(',');
}

/** 某个主题下的 --wd-* 变量表（bg 固定为 transparent，字体变量只在 light 中给出）。 */
export function wdVars(mode: Mode): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const t of TOKENS) vars[t.cssVar] = t[mode];
  vars['--wd-bg'] = 'transparent';
  if (mode === 'light') {
    vars['--wd-font-sans'] = fontStack('sans');
    vars['--wd-font-mono'] = fontStack('mono');
    vars['--wd-font-hand'] = fontStack('hand');
  }
  return vars;
}

/** 作用域化的 CSS：light 默认值 + prefers-color-scheme:dark 覆盖。 */
export function wdStyleCss(): string {
  const body = (v: Record<string, string>) => Object.entries(v).map(([k, x]) => `${k}:${x}`).join(';');
  return `.wisp-d{${body(wdVars('light'))}}@media (prefers-color-scheme:dark){.wisp-d{${body(wdVars('dark'))}}}`;
}

/** 允许出现在源文件里的颜色（light 令牌 + 白 + 黑 + 默认黑）。 */
export function isPaletteColor(input: string): boolean {
  const h = normalizeHex(input);
  if (!h) return false;
  return h === '#ffffff' || exactToken(h) !== null;
}

export const FONT_SIZES: number[] = Object.values(palette.diagram['font-size-px']);
export const GRID = palette.diagram['grid-px'];
