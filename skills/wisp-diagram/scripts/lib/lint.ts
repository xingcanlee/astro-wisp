import { Buffer } from 'node:buffer';
import { XMLParser } from 'fast-xml-parser';
import { listPages, normalizeDrawio } from './drawio.ts';
import { FONT_SIZES, GRID, isPaletteColor, nearestToken, normalizeHex } from './palette.ts';

export type LintLevel = 'error' | 'warn';
export type LintRule = 'palette-color' | 'font-size' | 'grid' | 'shadow' | 'gradient' | 'file-size' | 'compressed';

/** 可自动应用的修复。excalidraw：element[field] = to；drawio：style 中 field=to。 */
export interface LintFix {
  field: string;
  from?: string;
  to: string | number;
  /** drawio 的页面序号 */
  page?: number;
}

export interface LintIssue {
  level: LintLevel;
  rule: LintRule;
  message: string;
  elementId?: string;
  fix?: LintFix;
}

export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const FONT_TOLERANCE = 1;

const fontSizeOk = (n: number) => FONT_SIZES.some((s) => Math.abs(n - s) <= FONT_TOLERANCE);
const onGrid = (n: number) => Math.abs(n - Math.round(n / GRID) * GRID) <= 0.5;
const SKIP_COLOR = /^(none|transparent|default|inherit|swimlane)$/i;

function colorIssue(where: string, value: string, id: string | undefined, field: string, page?: number): LintIssue | null {
  if (SKIP_COLOR.test(value.trim())) return null;
  if (isPaletteColor(value)) return null;
  const hex = normalizeHex(value);
  if (!hex) {
    return { level: 'error', rule: 'palette-color', elementId: id, message: `${where}: unrecognised color "${value}"` };
  }
  const { token, deltaE } = nearestToken(hex);
  return {
    level: 'error', rule: 'palette-color', elementId: id,
    message: `${where}: ${value} is not in the palette; nearest is ${token.light} (--wd-${token.name}, ΔE ${deltaE.toFixed(1)})`,
    fix: { field, from: value, to: token.light, page },
  };
}

// ---------- Excalidraw ----------

type El = Record<string, unknown>;

export function lintExcalidraw(json: string | Record<string, unknown>): LintIssue[] {
  const issues: LintIssue[] = [];
  const text = typeof json === 'string' ? json : JSON.stringify(json);
  if (Buffer.byteLength(text) > MAX_SOURCE_BYTES) {
    issues.push({ level: 'warn', rule: 'file-size', message: `source is ${(Buffer.byteLength(text) / 1048576).toFixed(1)} MB (> 2 MB); embedded images in "files" bloat it` });
  }
  const doc = (typeof json === 'string' ? JSON.parse(json) : json) as { elements?: El[] };
  for (const el of doc.elements ?? []) {
    if (el.isDeleted) continue;
    const id = el.id as string | undefined;
    const type = String(el.type);
    for (const field of ['strokeColor', 'backgroundColor']) {
      const v = el[field];
      if (typeof v === 'string') {
        const i = colorIssue(`${type} ${field}`, v, id, field);
        if (i) issues.push(i);
      }
    }
    if (type === 'text' && typeof el.fontSize === 'number' && !fontSizeOk(el.fontSize)) {
      issues.push({ level: 'warn', rule: 'font-size', elementId: id, message: `text fontSize ${el.fontSize} is not one of ${FONT_SIZES.join('/')} (±${FONT_TOLERANCE})` });
    }
    const gridTypes = ['rectangle', 'ellipse', 'diamond', 'text', 'image', 'frame', 'magicframe', 'embeddable'];
    if (gridTypes.includes(type) && !(type === 'text' && el.containerId)) {
      const off = ['x', 'y'].filter((k) => typeof el[k] === 'number' && !onGrid(el[k] as number));
      if (off.length) {
        issues.push({ level: 'warn', rule: 'grid', elementId: id, message: `${type} ${off.map((k) => `${k}=${el[k]}`).join(', ')} not aligned to ${GRID}px grid` });
      }
    }
    for (const [k, v] of Object.entries(el)) {
      if (/shadow/i.test(k) && v) issues.push({ level: 'error', rule: 'shadow', elementId: id, message: `${type} uses shadow (${k})` });
      if (typeof v === 'string' && /gradient\(/i.test(v)) issues.push({ level: 'error', rule: 'gradient', elementId: id, message: `${type} ${k} uses a gradient` });
    }
  }
  return issues;
}

// ---------- draw.io ----------

export function parseStyle(style: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of style.split(';')) {
    if (!part) continue;
    const i = part.indexOf('=');
    if (i < 0) m.set(part, '');
    else m.set(part.slice(0, i), part.slice(i + 1));
  }
  return m;
}

const STYLE_COLOR_KEYS = ['fillColor', 'strokeColor', 'fontColor', 'labelBackgroundColor', 'labelBorderColor', 'swimlaneFillColor', 'background', 'gradientColor'];

type Raw = Record<string, any>;
const arr = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function collectCells(node: unknown, out: Raw[]): void {
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node as Raw)) {
    if (k === 'mxCell' || k === 'object' || k === 'UserObject') {
      for (const c of arr<Raw>(v as Raw)) {
        out.push(c);
        collectCells(c, out);
      }
    } else if (typeof v === 'object') collectCells(v, out);
  }
}

export function lintDrawio(xml: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const bytes = Buffer.byteLength(xml);
  if (bytes > MAX_SOURCE_BYTES) {
    issues.push({ level: 'warn', rule: 'file-size', message: `source is ${(bytes / 1048576).toFixed(1)} MB (> 2 MB)` });
  }
  if (listPages(xml).some((p) => p.compressed)) {
    issues.push({ level: 'warn', rule: 'compressed', message: 'diagram content is compressed; run normalize to store plain XML', fix: { field: 'compressed', to: 'normalize' } });
  }
  const plain = normalizeDrawio(xml);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: false, parseAttributeValue: false });
  const parsed = parser.parse(plain) as Raw;
  const pages = arr<Raw>(parsed.mxfile?.diagram ?? (parsed.mxGraphModel ? { mxGraphModel: parsed.mxGraphModel } : undefined));
  pages.forEach((page, pi) => {
    const cells: Raw[] = [];
    collectCells(page, cells);
    for (const cell of cells) {
      const id = cell['@_id'] as string | undefined;
      const style = parseStyle((cell['@_style'] as string | undefined) ?? '');
      const geom = cell.mxGeometry as Raw | undefined;
      for (const key of STYLE_COLOR_KEYS) {
        const v = style.get(key);
        if (v === undefined) continue;
        if (key === 'gradientColor') {
          if (!SKIP_COLOR.test(v)) {
            issues.push({ level: 'error', rule: 'gradient', elementId: id, message: `gradientColor=${v} (gradients are not allowed)`, fix: { field: 'gradientColor', from: v, to: 'none', page: pi } });
          }
          continue;
        }
        const i = colorIssue(`style ${key}`, v, id, key, pi);
        if (i) issues.push(i);
      }
      if (style.get('shadow') === '1') {
        issues.push({ level: 'error', rule: 'shadow', elementId: id, message: 'shadow=1 (shadows are not allowed)', fix: { field: 'shadow', from: '1', to: '0', page: pi } });
      }
      const fs = style.get('fontSize');
      if (fs !== undefined && Number.isFinite(+fs) && !fontSizeOk(+fs)) {
        issues.push({ level: 'warn', rule: 'font-size', elementId: id, message: `fontSize=${fs} is not one of ${FONT_SIZES.join('/')} (±${FONT_TOLERANCE})` });
      }
      // value 里的内联 HTML 颜色
      const value = cell['@_value'];
      if (typeof value === 'string') {
        for (const m of value.matchAll(/(?:color\s*[:=]\s*["']?|color&quot;?\s*[:=]\s*)(#[0-9a-fA-F]{3,8})\b/g)) {
          const i = colorIssue('value html color', m[1]!, id, 'value');
          if (i) {
            delete i.fix;
            issues.push(i);
          }
        }
      }
      if (cell['@_vertex'] === '1' && geom) {
        const off = ['x', 'y'].filter((k) => geom[`@_${k}`] !== undefined && !onGrid(Number(geom[`@_${k}`])));
        if (off.length) {
          issues.push({ level: 'warn', rule: 'grid', elementId: id, message: `${off.map((k) => `${k}=${geom[`@_${k}`]}`).join(', ')} not aligned to ${GRID}px grid` });
        }
      }
    }
  });
  return issues;
}

// ---------- fixes ----------

function setStyleKey(style: string, key: string, to: string): string {
  const parts = style.split(';').filter(Boolean);
  let hit = false;
  const next = parts.map((p) => {
    if (p === key || p.startsWith(`${key}=`)) {
      hit = true;
      return `${key}=${to}`;
    }
    return p;
  });
  if (!hit) next.push(`${key}=${to}`);
  return next.join(';') + ';';
}

/** 应用 issues 中带 fix 的修复，返回新的源文件文本。drawio 会同时解压为明文。 */
export function applyFixes(kind: 'excalidraw' | 'drawio', source: string, issues: LintIssue[]): string {
  const fixable = issues.filter((i) => i.fix);
  if (kind === 'excalidraw') {
    const doc = JSON.parse(source) as { elements?: El[] };
    for (const i of fixable) {
      const el = doc.elements?.find((e) => e.id === i.elementId);
      if (el && i.fix!.field !== 'compressed') el[i.fix!.field] = i.fix!.to;
    }
    return JSON.stringify(doc, null, 2) + '\n';
  }
  let xml = normalizeDrawio(source);
  // 从后往前改，避免偏移失效
  for (const i of [...fixable].reverse()) {
    const fx = i.fix!;
    if (fx.field === 'compressed' || !i.elementId) continue;
    const ranges: { start: number; end: number }[] = [];
    for (const m of xml.matchAll(/<diagram\b[\s\S]*?<\/diagram>/g)) ranges.push({ start: m.index!, end: m.index! + m[0].length });
    if (!ranges.length) ranges.push({ start: 0, end: xml.length });
    const r = ranges[fx.page ?? 0] ?? ranges[0]!;
    const slice = xml.slice(r.start, r.end);
    const idEsc = i.elementId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<(mxCell|object|UserObject)\\b[^>]*\\sid="${idEsc}"[^>]*>`);
    const tag = re.exec(slice);
    if (!tag) continue;
    const newTag = /\sstyle="([^"]*)"/.test(tag[0])
      ? tag[0].replace(/\sstyle="([^"]*)"/, (_m, s: string) => ` style="${setStyleKey(s, fx.field, String(fx.to))}"`)
      : tag[0];
    xml = xml.slice(0, r.start) + slice.slice(0, tag.index) + newTag + slice.slice(tag.index + tag[0].length) + xml.slice(r.end);
  }
  return xml;
}
