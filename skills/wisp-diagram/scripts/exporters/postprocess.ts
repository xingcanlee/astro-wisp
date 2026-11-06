/**
 * SVG 后处理串联（diagrams.md §3）：
 *   导出器原始 SVG → 预清理 → toPortableSvg（T5a：颜色变量化 + 作用域 style + 字体变量）
 *   → svgo（保留 viewBox / style / var()，id 加文件名前缀）→ a11y 注入 → 可选字体子集嵌入
 */
import { optimize, type Config } from 'svgo';
import { toPortableSvg } from '../lib/portable-svg.ts';
import { embedFonts } from './fonts.ts';

export type DiagramStyle = 'hand' | 'clean';

export interface PostprocessOptions {
  style: DiagramStyle;
  /** 源文件名（不含目录），写入 data-source */
  source: string;
  /** id 前缀，一般为源文件 basename（kebab-case） */
  idPrefix: string;
  title: string;
  desc?: string;
  /** draw.io 页面名 */
  page?: string;
  embedFonts?: boolean;
  /** 透传给 toPortableSvg：把非调色板颜色吸附到最近令牌 */
  fix?: boolean;
}

export interface PostprocessResult {
  svg: string;
  warnings: string[];
  unknownColors: string[];
  fontBytes: number;
}

export const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** id 前缀：只保留字母数字和连字符，首字符必须是字母。 */
export function sanitizeIdPrefix(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'diagram';
  return /^[a-z]/.test(s) ? s : `d-${s}`;
}

/** 导出器自带、与 Wisp 无关的内容。 */
export function preclean(svg: string): string {
  return svg
    .replace(/<\?xml[^>]*>\s*/g, '')
    .replace(/<!DOCTYPE[^>]*>\s*/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata\b[\s\S]*?<\/metadata>|<metadata\b[^>]*\/>/g, '')
    .replace(/<style\b[^>]*class="style-fonts"[^>]*>\s*<\/style>/g, '')
    .replace(/<defs>\s*<\/defs>|<defs\/>/g, '')
    .replace(/<(title|desc)\b[\s\S]*?<\/\1>/g, '');
}

export function svgoConfig(idPrefix: string): Config {
  return {
    multipass: false,
    js2svg: { pretty: false },
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            // 会破坏 var() / <style> / 可访问性 / foreignObject 的插件一律关闭
            cleanupIds: false,
            inlineStyles: false,
            minifyStyles: false,
            mergeStyles: false,
            convertColors: false,
            removeUnknownsAndDefaults: false,
            removeUselessStrokeAndFill: false,
            removeDesc: false,
            removeHiddenElems: false,
          },
        },
      },
      { name: 'prefixIds', params: { prefix: idPrefix, delim: '-', prefixIds: true, prefixClassNames: false } },
    ],
  };
}

function rootAttr(svg: string, name: string): string | undefined {
  const open = /<svg\b[^>]*>/.exec(svg)?.[0] ?? '';
  return new RegExp(`\\s${name}="([^"]*)"`).exec(open)?.[1];
}

/** 注入 role / aria / data-* / <title> / <desc>，并保证有 width/height（取自 viewBox）。 */
export function injectA11y(svg: string, o: Pick<PostprocessOptions, 'style' | 'source' | 'idPrefix' | 'title' | 'desc' | 'page'>): string {
  const tid = `${o.idPrefix}-title`;
  const did = `${o.idPrefix}-desc`;
  const hasDesc = !!o.desc?.trim();
  const vb = rootAttr(svg, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
  return svg.replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
    let a = attrs.replace(/\s(role|aria-labelledby|aria-label|aria-describedby|data-wisp-diagram|data-source|data-style|data-page)="[^"]*"/g, '');
    if (vb && vb.length === 4 && vb.every(Number.isFinite)) {
      a = a.replace(/\s(width|height)="[^"]*"/g, '');
      a += ` width="${+vb[2]!.toFixed(2)}" height="${+vb[3]!.toFixed(2)}"`;
    }
    a += ` role="img" aria-labelledby="${hasDesc ? `${tid} ${did}` : tid}"`;
    a += ` data-wisp-diagram="1" data-source="${escapeXml(o.source)}" data-style="${o.style}"`;
    if (o.page !== undefined) a += ` data-page="${escapeXml(o.page)}"`;
    const head = `<title id="${tid}">${escapeXml(o.title)}</title>` + (hasDesc ? `<desc id="${did}">${escapeXml(o.desc!.trim())}</desc>` : '');
    return `<svg${a}>${head}`;
  });
}

/**
 * <mask> 里的黑白是亮度通道，不是“颜色”：映射成主题变量会让暗色下遮罩反转
 * （Excalidraw 的箭头标签就靠 mask 在线条上挖洞）。先摘出来，映射后再放回。
 */
export function protectMasks(svg: string): { svg: string; restore: (s: string) => string } {
  const saved: string[] = [];
  const out = svg.replace(/<mask\b[^>]*\/>|<mask\b[^>]*>[\s\S]*?<\/mask>/g, (m) => `<wisp-protect n="${saved.push(m) - 1}"/>`);
  return { svg: out, restore: (s) => s.replace(/<wisp-protect n="(\d+)"\s*\/>/g, (_m, n: string) => saved[Number(n)]!) };
}

export async function postprocess(raw: string, o: PostprocessOptions): Promise<PostprocessResult> {
  const masked = protectMasks(preclean(raw));
  const portable = toPortableSvg(masked.svg, { style: o.style, fix: o.fix });
  portable.svg = masked.restore(portable.svg);
  const warnings = [...portable.warnings];
  let svg = optimize(portable.svg, svgoConfig(o.idPrefix)).data;
  svg = injectA11y(svg, o);
  let fontBytes = 0;
  if (o.embedFonts) {
    const r = await embedFonts(svg);
    svg = r.svg;
    fontBytes = r.bytes;
  }
  if (!svg.endsWith('\n')) svg += '\n';
  return { svg, warnings, unknownColors: portable.unknownColors, fontBytes };
}
