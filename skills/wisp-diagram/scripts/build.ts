#!/usr/bin/env -S npx tsx
/**
 * 源文件 → 可移植 .wisp.svg（导出 + 颜色映射 + svgo + a11y [+ 字体子集]）。
 *
 *   npx tsx build.ts <file.excalidraw|file.drawio>... [选项]
 *     --embed-fonts            按实际字符裁剪 Inter / Noto Sans SC（hand 另加 Excalifont）并内嵌
 *     --fix                    非调色板颜色吸附到最近令牌（默认只警告）
 *     --title <t> --desc <d>   覆盖 <title>/<desc>（仅单文件时可用）
 *     --drawio cli|docker|browser   强制 draw.io 导出方式（默认自动探测）
 *     --out-dir <dir>          输出目录（默认与源文件同目录）
 *     --strict                 出现非调色板颜色时退出码为 1
 *     --probe                  只打印 draw.io 导出方式探测结果
 *
 * 输出命名：<name>.wisp.svg；多页 draw.io 的第 2 页起为 <name>.page-<N>.wisp.svg（N 从 1 计），
 * 每个文件根元素带 data-page="<页面名>"。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeDrawio } from './lib/drawio.ts';
import { BrowserSession } from './exporters/browser.ts';
import { type DrawioMethod, drawioPageLabels, exportDrawioSvgs, probeDrawio } from './exporters/drawio.ts';
import { exportExcalidrawSvg } from './exporters/excalidraw.ts';
import { type DiagramStyle, postprocess, sanitizeIdPrefix } from './exporters/postprocess.ts';

export interface BuildOptions {
  embedFonts?: boolean;
  fix?: boolean;
  title?: string;
  desc?: string;
  drawio?: DrawioMethod;
  outDir?: string;
  /** 默认 true；false 时只返回内容不写盘 */
  write?: boolean;
  session?: BrowserSession;
}

export interface BuildOutput {
  path: string;
  svg: string;
  page?: { index: number; name: string };
}

export interface BuildResult {
  source: string;
  style: DiagramStyle;
  exporter: string;
  outputs: BuildOutput[];
  warnings: string[];
  unknownColors: string[];
}

export function styleOf(file: string): DiagramStyle {
  const ext = extname(file).toLowerCase();
  if (ext === '.excalidraw') return 'hand';
  if (ext === '.drawio') return 'clean';
  throw new Error(`[wisp-diagram] 不支持的源文件类型：${file}（只支持 .excalidraw / .drawio）`);
}

export const stem = (file: string) => basename(file).replace(/\.(excalidraw|drawio)$/i, '');

/** 源文件对应的输出路径。pageIndex 从 0 计；0 页即 <name>.wisp.svg。 */
export function outputPathFor(file: string, pageIndex = 0, outDir?: string): string {
  const dir = outDir ?? dirname(file);
  return join(dir, pageIndex === 0 ? `${stem(file)}.wisp.svg` : `${stem(file)}.page-${pageIndex + 1}.wisp.svg`);
}

const humanize = (s: string) => s.replace(/[-_]+/g, ' ').trim();
const clip = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

interface ExcalidrawTextEl { type: string; text?: string; fontSize?: number; containerId?: string | null; isDeleted?: boolean; y?: number; x?: number }

/** 默认标题：最大字号的独立文本（≥18px），否则文件名；描述：其余文字按出现位置拼接。 */
export function excalidrawTitleDesc(scene: { elements?: ExcalidrawTextEl[] }, file: string): { title: string; desc: string } {
  const texts = (scene.elements ?? []).filter((e) => e.type === 'text' && !e.isDeleted && e.text?.trim());
  const free = texts.filter((e) => !e.containerId).sort((a, b) => (b.fontSize ?? 0) - (a.fontSize ?? 0));
  const titleEl = free[0] && (free[0].fontSize ?? 0) >= 18 ? free[0] : undefined;
  const rest = texts.filter((e) => e !== titleEl)
    .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
    .map((e) => e.text!.replace(/\s+/g, ' ').trim());
  return { title: titleEl?.text?.replace(/\s+/g, ' ').trim() ?? humanize(stem(file)), desc: clip([...new Set(rest)].join('；')) };
}

export async function buildDiagram(file: string, opts: BuildOptions = {}): Promise<BuildResult> {
  const abs = resolve(file);
  const style = styleOf(abs);
  const own = !opts.session;
  const session = opts.session ?? new BrowserSession();
  const prefixBase = sanitizeIdPrefix(stem(abs));
  const source = basename(abs);
  const warnings: string[] = [];
  const unknown = new Set<string>();
  const outputs: BuildOutput[] = [];
  let exporter: string = 'excalidraw-playwright';
  try {
    const raw = readFileSync(abs, 'utf8');
    if (style === 'hand') {
      const scene = JSON.parse(raw) as { elements?: ExcalidrawTextEl[] };
      const td = excalidrawTitleDesc(scene, abs);
      const svgRaw = await exportExcalidrawSvg(session, raw);
      const r = await postprocess(svgRaw, {
        style, source, idPrefix: prefixBase, title: opts.title ?? td.title, desc: opts.desc ?? td.desc,
        embedFonts: opts.embedFonts, fix: opts.fix,
      });
      warnings.push(...r.warnings);
      r.unknownColors.forEach((c) => unknown.add(c));
      outputs.push({ path: outputPathFor(abs, 0, opts.outDir), svg: r.svg });
    } else {
      const xml = normalizeDrawio(raw);
      const { method, pages } = await exportDrawioSvgs(session, xml, { method: opts.drawio });
      exporter = `drawio-${method}`;
      const multi = pages.length > 1;
      for (const p of pages) {
        const defaultName = /^Page-\d+$/.test(p.name);
        const title = opts.title ?? (defaultName ? humanize(stem(abs)) + (multi ? ` · ${p.name}` : '') : p.name);
        const desc = opts.desc ?? clip([...new Set(drawioPageLabels(xml, p.index))].join('；'));
        const r = await postprocess(p.svg, {
          style, source, idPrefix: p.index === 0 ? prefixBase : `${prefixBase}-p${p.index + 1}`,
          title, desc, page: p.name, embedFonts: opts.embedFonts, fix: opts.fix,
        });
        warnings.push(...r.warnings.map((w) => `[${p.name}] ${w}`));
        r.unknownColors.forEach((c) => unknown.add(c));
        outputs.push({ path: outputPathFor(abs, p.index, opts.outDir), svg: r.svg, page: { index: p.index, name: p.name } });
      }
    }
  } finally {
    if (own) await session.close();
  }
  if (opts.write !== false) {
    for (const o of outputs) {
      mkdirSync(dirname(o.path), { recursive: true });
      writeFileSync(o.path, o.svg);
    }
  }
  return { source: abs, style, exporter, outputs, warnings, unknownColors: [...unknown].sort() };
}

const USAGE = `用法：build <file.excalidraw|file.drawio>... [--embed-fonts] [--fix] [--strict]
       [--title T --desc D] [--drawio cli|docker|browser] [--out-dir DIR] [--probe]\n`;

async function main(argv: string[]): Promise<number> {
  const args = [...argv];
  const files: string[] = [];
  const opts: BuildOptions = {};
  let strict = false;
  while (args.length) {
    const a = args.shift()!;
    switch (a) {
      case '--embed-fonts': opts.embedFonts = true; break;
      case '--fix': opts.fix = true; break;
      case '--strict': strict = true; break;
      case '--title': opts.title = args.shift(); break;
      case '--desc': opts.desc = args.shift(); break;
      case '--drawio': opts.drawio = args.shift() as DrawioMethod; break;
      case '--out-dir': opts.outDir = resolve(args.shift()!); break;
      case '--probe':
        for (const p of probeDrawio()) process.stdout.write(`${p.ok ? '✓' : '✗'} ${p.method}: ${p.detail}\n`);
        return 0;
      case '-h': case '--help': process.stdout.write(USAGE); return 0;
      default: files.push(a);
    }
  }
  if (!files.length) { process.stderr.write(USAGE); return 2; }
  if (files.length > 1 && (opts.title || opts.desc)) { process.stderr.write('--title/--desc 只能用于单个文件\n'); return 2; }
  const session = new BrowserSession();
  let bad = false;
  try {
    for (const f of files) {
      const r = await buildDiagram(f, { ...opts, session });
      for (const o of r.outputs) process.stdout.write(`${basename(f)} → ${o.path}${o.page ? ` (page ${o.page.name})` : ''} [${r.exporter}]\n`);
      for (const w of r.warnings) process.stderr.write(`  warning: ${w}\n`);
      if (r.unknownColors.length) {
        bad = true;
        process.stderr.write(`  非调色板颜色：${r.unknownColors.join(', ')}（运行 lint --fix 或 build --fix）\n`);
      }
    }
  } finally {
    await session.close();
  }
  return strict && bad ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e: Error) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}
