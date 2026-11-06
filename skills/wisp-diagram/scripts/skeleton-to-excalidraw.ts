#!/usr/bin/env -S npx tsx
/**
 * 骨架 JSON → .excalidraw（diagrams.md §6.2）。
 *
 *   npx tsx skeleton-to-excalidraw.ts <skeleton.json> [-o out.excalidraw] [--seed N]
 *
 * 骨架只写 type、位置、尺寸、label、语义色名、箭头起止 id；完整元素（seed、boundElements、文本测量…）
 * 由 Excalidraw 自己的 convertToExcalidrawElements 在 Playwright 中生成。
 * 随机数被种子化，同一骨架多次转换得到相同结果。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserSession } from './exporters/browser.ts';
import { SKILL_DIR } from './exporters/env.ts';
import { convertSkeletonInBrowser } from './exporters/excalidraw.ts';

export type SizeName = 'title' | 'label' | 'note';

export interface SkeletonNode {
  id: string;
  shape?: 'rect' | 'ellipse' | 'diamond';
  x: number; y: number; w: number; h: number;
  label?: string;
  /** hue 名（blue…）、语义名（q/k/v/weight…）或基础色（fg/muted） */
  color?: string;
  /** 文字颜色，默认与 color 的描边色相同 */
  labelColor?: string;
  size?: SizeName;
  emphasis?: boolean;
  dashed?: boolean;
}

export interface SkeletonEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
  color?: string;
  dashed?: boolean;
  emphasis?: boolean;
  /** 箭头样式，默认 end */
  arrow?: 'end' | 'both' | 'none';
}

export interface SkeletonText {
  id?: string;
  x: number; y: number;
  text: string;
  size?: SizeName;
  color?: string;
}

export interface Skeleton {
  style?: 'hand';
  nodes?: SkeletonNode[];
  edges?: SkeletonEdge[];
  texts?: SkeletonText[];
}

interface Pair { light: string; dark: string }
interface PaletteJson {
  color: { base: Record<string, Pair>; hue: Record<string, { stroke: Pair; fill: Pair }>; semantic: Record<string, string> };
  diagram: {
    'stroke-width': { thin: number; normal: number; bold: number };
    'font-size-px': Record<SizeName, number>;
    'grid-px': number;
    excalidraw: { roughness: number; fillStyle: string; strokeStyle: string };
  };
}

let paletteCache: PaletteJson | null = null;
export function loadPalette(): PaletteJson {
  paletteCache ??= JSON.parse(readFileSync(join(SKILL_DIR, 'palette.json'), 'utf8')) as PaletteJson;
  return paletteCache;
}

export interface ResolvedSkeletonColor { stroke: string; fill: string }

/** hue / 语义名 / 基础色 → 浅色 stroke + fill（导出时再由 toPortableSvg 变量化）。 */
export function resolveSkeletonColor(name: string | undefined): ResolvedSkeletonColor {
  const p = loadPalette();
  if (!name || name === 'fg') return { stroke: p.color.base.fg!.light, fill: 'transparent' };
  if (name === 'muted') return { stroke: p.color.base.muted!.light, fill: 'transparent' };
  const hue = p.color.hue[name] ? name : p.color.semantic[name];
  const h = hue ? p.color.hue[hue] : undefined;
  if (!h) {
    const valid = [...Object.keys(p.color.hue), ...Object.keys(p.color.semantic).filter((k) => !k.startsWith('$')), 'fg', 'muted'];
    throw new Error(`[wisp-diagram] 未知颜色名 "${name}"。可用：${valid.join(', ')}`);
  }
  return { stroke: h.stroke.light, fill: h.fill.light };
}

const SHAPE = { rect: 'rectangle', ellipse: 'ellipse', diamond: 'diamond' } as const;
/** Excalidraw FONT_FAMILY.Excalifont */
export const EXCALIFONT = 5;
/** ROUNDNESS.ADAPTIVE_RADIUS */
const ADAPTIVE_RADIUS = 3;

export interface SkeletonWarnings { warnings: string[] }

/** 箭头端点与节点边缘的间隙（px），与 Excalidraw 编辑器中绑定箭头的观感一致。 */
export const ARROW_GAP = 6;

/** 从节点中心沿方向 (ux, uy)（单位向量）到形状边缘的距离。 */
export function distanceToEdge(n: SkeletonNode, ux: number, uy: number): number {
  const hw = n.w / 2, hh = n.h / 2;
  const ax = Math.abs(ux), ay = Math.abs(uy);
  switch (n.shape ?? 'rect') {
    case 'ellipse': return 1 / Math.sqrt((ax / hw) ** 2 + (ay / hh) ** 2);
    case 'diamond': return 1 / (ax / hw + ay / hh);
    default: return Math.min(ax > 1e-9 ? hw / ax : Infinity, ay > 1e-9 ? hh / ay : Infinity);
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** 两节点之间直线箭头的几何：起点在 a 的边缘外 ARROW_GAP，终点在 b 的边缘外 ARROW_GAP。 */
export function edgeGeometry(a: SkeletonNode, b: SkeletonNode): { x: number; y: number; dx: number; dy: number } {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1e-6) throw new Error(`[wisp-diagram] 连线 ${a.id} → ${b.id} 的两个节点中心重合`);
  const ux = (bx - ax) / len, uy = (by - ay) / len;
  const s = distanceToEdge(a, ux, uy) + ARROW_GAP;
  const t = distanceToEdge(b, -ux, -uy) + ARROW_GAP;
  if (s + t >= len) throw new Error(`[wisp-diagram] 节点 ${a.id} 与 ${b.id} 距离太近，放不下箭头`);
  const x = ax + ux * s, y = ay + uy * s;
  return { x: round2(x), y: round2(y), dx: round2(bx - ux * t - x), dy: round2(by - uy * t - y) };
}

/** 骨架 → ExcalidrawElementSkeleton[]（纯函数，可在 node 中测试）。 */
export function skeletonToElementSkeletons(sk: Skeleton): { elements: Record<string, unknown>[]; warnings: string[] } {
  const p = loadPalette();
  const d = p.diagram;
  const grid = d['grid-px'];
  const warnings: string[] = [];
  const common = { roughness: d.excalidraw.roughness, fillStyle: d.excalidraw.fillStyle };
  const sw = (emph?: boolean) => (emph ? d['stroke-width'].bold : d['stroke-width'].normal);
  const nodes = sk.nodes ?? [];
  const byId = new Map<string, SkeletonNode>();
  const out: Record<string, unknown>[] = [];

  for (const n of nodes) {
    if (!n.id) throw new Error('[wisp-diagram] 节点缺少 id');
    if (byId.has(n.id)) throw new Error(`[wisp-diagram] 节点 id 重复：${n.id}`);
    byId.set(n.id, n);
    for (const k of ['x', 'y', 'w', 'h'] as const) {
      if (typeof n[k] !== 'number') throw new Error(`[wisp-diagram] 节点 ${n.id} 缺少数值字段 ${k}`);
      if (n[k] % grid !== 0) warnings.push(`节点 ${n.id} 的 ${k}=${n[k]} 不在 ${grid}px 网格上`);
    }
    const c = resolveSkeletonColor(n.color);
    const shape = SHAPE[n.shape ?? 'rect'];
    if (!shape) throw new Error(`[wisp-diagram] 节点 ${n.id} 的 shape 无效：${n.shape}`);
    const el: Record<string, unknown> = {
      type: shape, id: n.id, x: n.x, y: n.y, width: n.w, height: n.h,
      strokeColor: c.stroke, backgroundColor: c.fill, strokeWidth: sw(n.emphasis),
      strokeStyle: n.dashed ? 'dashed' : d.excalidraw.strokeStyle, ...common,
    };
    if (shape === 'rectangle' || shape === 'diamond') el.roundness = { type: ADAPTIVE_RADIUS };
    if (n.label) {
      el.label = {
        text: n.label, fontSize: d['font-size-px'][n.size ?? 'label'], fontFamily: EXCALIFONT,
        strokeColor: n.labelColor ? resolveSkeletonColor(n.labelColor).stroke : c.stroke,
        textAlign: 'center', verticalAlign: 'middle',
      };
    }
    out.push(el);
  }

  (sk.edges ?? []).forEach((e, i) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) throw new Error(`[wisp-diagram] 连线 ${e.from} → ${e.to} 引用了不存在的节点`);
    const c = resolveSkeletonColor(e.color ?? 'fg');
    // convertToExcalidrawElements 只建立绑定、不计算端点，所以这里把端点放到节点边缘（留 ARROW_GAP 间隙）
    const g = edgeGeometry(a, b);
    const el: Record<string, unknown> = {
      type: 'arrow', id: e.id ?? `edge-${i + 1}-${e.from}-${e.to}`,
      x: g.x, y: g.y, width: Math.abs(g.dx), height: Math.abs(g.dy), points: [[0, 0], [g.dx, g.dy]],
      strokeColor: c.stroke, backgroundColor: 'transparent', strokeWidth: sw(e.emphasis),
      strokeStyle: e.dashed ? 'dashed' : d.excalidraw.strokeStyle, ...common,
      roundness: null,
      start: { id: e.from }, end: { id: e.to },
      startArrowhead: e.arrow === 'both' ? 'arrow' : null,
      endArrowhead: e.arrow === 'none' ? null : 'arrow',
    };
    if (e.label) el.label = { text: e.label, fontSize: d['font-size-px'].note, fontFamily: EXCALIFONT, strokeColor: c.stroke };
    out.push(el);
  });

  (sk.texts ?? []).forEach((t, i) => {
    const size = t.size ?? 'label';
    const color = t.color ?? (size === 'note' ? 'muted' : 'fg');
    out.push({
      type: 'text', id: t.id ?? `text-${i + 1}`, x: t.x, y: t.y, text: t.text,
      fontSize: d['font-size-px'][size], fontFamily: EXCALIFONT,
      strokeColor: resolveSkeletonColor(color).stroke, ...common,
    });
  });
  return { elements: out, warnings };
}

export interface SkeletonConvertOptions { session?: BrowserSession; seed?: number }

/** 骨架 → 完整 .excalidraw 文档（字符串，已格式化）。 */
export async function skeletonToExcalidraw(sk: Skeleton, opts: SkeletonConvertOptions = {}): Promise<{ json: string; warnings: string[] }> {
  if (sk.style && sk.style !== 'hand') throw new Error(`[wisp-diagram] 骨架只支持 hand 风格（clean 风格请直接写 draw.io XML）`);
  const { elements: skel, warnings } = skeletonToElementSkeletons(sk);
  const own = !opts.session;
  const session = opts.session ?? new BrowserSession();
  try {
    const elements = (await convertSkeletonInBrowser(session, skel, opts.seed ?? 1)) as Record<string, unknown>[];
    for (const el of elements) el.updated = 1; // 去掉时间戳，保证可复现
    const doc = {
      type: 'excalidraw', version: 2, source: 'wisp-diagram',
      elements, appState: { gridSize: loadPalette().diagram['grid-px'], viewBackgroundColor: '#ffffff' }, files: {},
    };
    return { json: await formatScene(doc), warnings };
  } finally {
    if (own) await session.close();
  }
}

/** 优先用 T5a 的 normalizeExcalidraw，保证与 `normalize` 输出一致。 */
async function formatScene(doc: Record<string, unknown>): Promise<string> {
  try {
    const mod = (await import('./lib/excalidraw.ts')) as { normalizeExcalidraw?: (d: unknown) => string };
    if (typeof mod.normalizeExcalidraw === 'function') return mod.normalizeExcalidraw(doc);
  } catch { /* 回退 */ }
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function defaultSkeletonOutput(input: string): string {
  return input.replace(/(\.skeleton)?\.json$/i, '') + '.excalidraw';
}

async function main(argv: string[]): Promise<number> {
  const args = [...argv];
  let out: string | undefined;
  let seed = 1;
  const files: string[] = [];
  while (args.length) {
    const a = args.shift()!;
    if (a === '-o' || a === '--out') out = args.shift();
    else if (a === '--seed') seed = Number(args.shift());
    else if (a === '-h' || a === '--help') {
      process.stdout.write('用法：skeleton-to-excalidraw <skeleton.json> [-o out.excalidraw] [--seed N]\n');
      return 0;
    } else files.push(a);
  }
  if (files.length !== 1) {
    process.stderr.write('用法：skeleton-to-excalidraw <skeleton.json> [-o out.excalidraw] [--seed N]\n');
    return 2;
  }
  const input = resolve(files[0]!);
  const sk = JSON.parse(readFileSync(input, 'utf8')) as Skeleton;
  const { json, warnings } = await skeletonToExcalidraw(sk, { seed });
  for (const w of warnings) process.stderr.write(`warning: ${w}\n`);
  const dest = resolve(out ?? defaultSkeletonOutput(input));
  writeFileSync(dest, json);
  process.stdout.write(`${basename(input)} → ${dest}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e: Error) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}
