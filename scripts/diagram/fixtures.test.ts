/**
 * tests/fixtures/diagrams 的产物检查。
 * - 静态部分（默认运行，不需要浏览器）：已提交的 .wisp.svg 满足可移植 SVG 规范。
 * - 端到端部分（WISP_DIAGRAM_E2E=1 时运行，需要 Playwright Chromium）：重新导出并与已提交产物比对。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './manifest.ts';

const DIR = join(REPO_ROOT, 'tests', 'fixtures', 'diagrams');
const read = (f: string) => readFileSync(join(DIR, f), 'utf8');
const HUES = ['blue', 'amber', 'green', 'rose', 'violet', 'teal', 'orange', 'slate'];

const OUTPUTS = [
  { file: 'hand-attention.wisp.svg', style: 'hand', source: 'hand-attention.excalidraw', prefix: 'hand-attention' },
  { file: 'clean-transformer.wisp.svg', style: 'clean', source: 'clean-transformer.drawio', prefix: 'clean-transformer', page: 'encoder' },
  { file: 'clean-transformer.page-2.wisp.svg', style: 'clean', source: 'clean-transformer.drawio', prefix: 'clean-transformer-p2', page: '数据流' },
];

/** 去掉 <style> 与 <mask> 后的图元部分 */
const body = (svg: string) => svg.replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/<mask\b[\s\S]*?<\/mask>/g, '');

describe.each(OUTPUTS)('$file', (o) => {
  const svg = read(o.file);
  const open = /<svg\b[^>]*>/.exec(svg)![0];

  it('根元素属性', () => {
    expect(open).toMatch(/\sviewBox="0 0 [\d.]+ [\d.]+"/);
    expect(open).toContain('class="wisp-d"');
    expect(open).toContain('role="img"');
    expect(open).toContain(`aria-labelledby="${o.prefix}-title ${o.prefix}-desc"`);
    expect(open).toContain('data-wisp-diagram="1"');
    expect(open).toContain(`data-source="${o.source}"`);
    expect(open).toContain(`data-style="${o.style}"`);
    if (o.page) expect(open).toContain(`data-page="${o.page}"`);
  });

  it('title / desc 带文件名前缀 id', () => {
    expect(svg).toMatch(new RegExp(`<title id="${o.prefix}-title">[^<]+</title>`));
    expect(svg).toMatch(new RegExp(`<desc id="${o.prefix}-desc">[^<]+</desc>`));
  });

  it('内置浅/深两套 --wd-* 且选择器都有 .wisp-d 前缀', () => {
    const css = [...svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
    expect(css).toMatch(/@media \(prefers-color-scheme:dark\)/);
    const selectors = css.replace(/@media[^{]*\{/g, '').match(/(^|\})\s*([^{}@]+)\{/g) ?? [];
    for (const s of selectors) expect(s.replace(/^\}?\s*/, '')).toMatch(/^\.wisp-d\b/);
  });

  it('图元中没有残留的十六进制颜色；所有 id 都带前缀', () => {
    const b = body(svg);
    expect(b).not.toMatch(/(fill|stroke|color)\s*[=:]\s*"?#[0-9a-f]{3,8}\b(?!\))/i);
    for (const m of svg.matchAll(/\sid="([^"]+)"/g)) expect(m[1]!.startsWith(o.prefix.replace(/-p2$/, ''))).toBe(true);
  });

  it('包含中文', () => {
    expect(body(svg)).toMatch(/[一-鿿]/);
  });
});

describe('fixture 覆盖', () => {
  it('hand 用到全部 8 个 hue', () => {
    const b = body(read('hand-attention.wisp.svg'));
    for (const h of HUES) expect(b, h).toContain(`var(--wd-${h}`);
  });
  it('clean（两页合计）用到全部 8 个 hue', () => {
    const b = body(read('clean-transformer.wisp.svg')) + body(read('clean-transformer.page-2.wisp.svg'));
    for (const h of HUES) expect(b, h).toContain(`var(--wd-${h}`);
  });
  it('drawio 源文件是未压缩的两页 XML', () => {
    const xml = read('clean-transformer.drawio');
    expect(xml.match(/<diagram\b/g)).toHaveLength(2);
    expect(xml).toContain('<mxGraphModel');
  });
});

describe.skipIf(!process.env.WISP_DIAGRAM_E2E)('端到端导出（WISP_DIAGRAM_E2E=1）', () => {
  it('骨架 → .excalidraw 可复现，且与已提交文件一致', async () => {
    const { skeletonToExcalidraw } = await import('../../skills/wisp-diagram/scripts/skeleton-to-excalidraw.ts');
    const sk = JSON.parse(read('hand-attention.skeleton.json'));
    const { json } = await skeletonToExcalidraw(sk);
    expect(json).toBe(read('hand-attention.excalidraw'));
  }, 120_000);

  it('hand 与 clean 都能生成 .wisp.svg；hand 与已提交产物逐字节一致', async () => {
    const { buildDiagram } = await import('../../skills/wisp-diagram/scripts/build.ts');
    const { BrowserSession } = await import('../../skills/wisp-diagram/scripts/exporters/browser.ts');
    const session = new BrowserSession();
    try {
      const hand = await buildDiagram(join(DIR, 'hand-attention.excalidraw'), { session, write: false });
      expect(hand.outputs).toHaveLength(1);
      expect(hand.unknownColors).toEqual([]);
      expect(hand.outputs[0]!.svg).toBe(read('hand-attention.wisp.svg'));
      const clean = await buildDiagram(join(DIR, 'clean-transformer.drawio'), { session, write: false });
      expect(clean.outputs.map((x) => x.page?.name)).toEqual(['encoder', '数据流']);
      expect(clean.unknownColors).toEqual([]);
    } finally {
      await session.close();
    }
  }, 180_000);

  it('PNG：light 与 dark 渲染结果不同', async () => {
    const { svgToPng } = await import('../../skills/wisp-diagram/scripts/export-png.ts');
    const svg = read('clean-transformer.page-2.wisp.svg');
    const light = await svgToPng(svg, { theme: 'light', scale: 1 });
    const dark = await svgToPng(svg, { theme: 'dark', scale: 1 });
    expect(light.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(light.equals(dark)).toBe(false);
  }, 120_000);
});
