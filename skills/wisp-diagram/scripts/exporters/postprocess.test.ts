import { optimize } from 'svgo';
import { describe, expect, it } from 'vitest';
import { injectA11y, postprocess, preclean, protectMasks, sanitizeIdPrefix, svgoConfig } from './postprocess.ts';

/** 模拟 Excalidraw exportToSvg 的输出（带标签箭头的 mask、默认黑、hue 色）。 */
const RAW = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><!-- svg-source:excalidraw --><metadata></metadata><defs><style class="style-fonts">
      </style></defs>
<g stroke-linecap="round"><path d="M0 0 L100 0" stroke="#1d4ed8" stroke-width="1.5" fill="#dbeafe"/></g>
<mask/><g mask="url(#mask-a)"><path d="M0 50 L200 50" stroke="#1e1e1e" fill="none"/></g>
<mask id="mask-a"><rect x="0" y="0" fill="#fff" width="200" height="100"/><rect x="80" y="40" fill="#000" width="40" height="20"/></mask>
<text x="10" y="20" font-family="Excalifont, Xiaolai, Segoe UI Emoji" fill="#1e1e1e">注意力 Q·Kᵀ</text></svg>`;

describe('preclean', () => {
  it('去掉注释、metadata、空字体 style 和空 defs', () => {
    const s = preclean(RAW);
    expect(s).not.toContain('<!--');
    expect(s).not.toContain('<metadata');
    expect(s).not.toContain('style-fonts');
    expect(s).not.toMatch(/<defs>\s*<\/defs>/);
  });
});

describe('protectMasks', () => {
  it('摘出 mask（含自闭合）并能原样放回', () => {
    const { svg, restore } = protectMasks(RAW);
    expect(svg).not.toContain('<mask');
    expect(svg.match(/<wisp-protect/g)).toHaveLength(2);
    expect(restore(svg)).toBe(RAW);
  });
});

describe('sanitizeIdPrefix', () => {
  it('kebab-case，首字符为字母', () => {
    expect(sanitizeIdPrefix('Attention_Flow')).toBe('attention-flow');
    expect(sanitizeIdPrefix('2-layers')).toBe('d-2-layers');
    expect(sanitizeIdPrefix('注意力')).toBe('diagram');
  });
});

describe('svgoConfig', () => {
  it('保留 viewBox、<style>、var()、title/desc，id 加前缀但 class 不变', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="wisp-d" viewBox="0 0 10 10"><style>.wisp-d{--wd-fg:#111}</style><desc>d</desc><mask id="m"><rect width="10" height="10" fill="#fff"/></mask><rect width="10" height="10" mask="url(#m)" fill="var(--wd-blue, #1d4ed8)"/></svg>`;
    const out = optimize(svg, svgoConfig('fig')).data;
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('.wisp-d{--wd-fg:#111}');
    expect(out).toContain('var(--wd-blue, #1d4ed8)');
    expect(out).toContain('<desc>');
    expect(out).toContain('id="fig-m"');
    expect(out).toContain('url(#fig-m)');
    expect(out).toContain('class="wisp-d"');
  });
});

describe('injectA11y', () => {
  const base = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120.5 80" width="1" height="2" role="presentation"><g/></svg>';
  it('写入 role、aria-labelledby、data-*、title/desc，并按 viewBox 设置尺寸', () => {
    const s = injectA11y(base, { style: 'hand', source: 'a&b.excalidraw', idPrefix: 'ab', title: '标题 <x>', desc: '描述' });
    expect(s).toMatch(/^<svg[^>]* width="120.5" height="80"/);
    expect(s).toContain('role="img"');
    expect(s).not.toContain('role="presentation"');
    expect(s).toContain('aria-labelledby="ab-title ab-desc"');
    expect(s).toContain('data-wisp-diagram="1"');
    expect(s).toContain('data-source="a&amp;b.excalidraw"');
    expect(s).toContain('data-style="hand"');
    expect(s).toContain('<title id="ab-title">标题 &lt;x&gt;</title><desc id="ab-desc">描述</desc>');
  });
  it('没有描述时不输出 <desc>，aria 只指向 title；可写 data-page', () => {
    const s = injectA11y(base, { style: 'clean', source: 'x.drawio', idPrefix: 'x', title: 'T', page: 'encoder' });
    expect(s).toContain('aria-labelledby="x-title"');
    expect(s).not.toContain('<desc');
    expect(s).toContain('data-page="encoder"');
  });
});

describe('postprocess', () => {
  it('颜色变量化、mask 保持黑白、字体用变量、结构完整', async () => {
    const r = await postprocess(RAW, { style: 'hand', source: 'demo.excalidraw', idPrefix: 'demo', title: '演示', desc: '一条带标签的箭头' });
    const { svg } = r;
    expect(r.unknownColors).toEqual([]);
    expect(svg).toContain('class="wisp-d"');
    expect(svg).toContain('var(--wd-blue, #1d4ed8)');
    expect(svg).toContain('var(--wd-blue-fill, #dbeafe)');
    expect(svg).toContain('var(--wd-fg, #1d1d1f)');
    expect(svg).toContain('var(--wd-font-hand)');
    expect(svg).toMatch(/@media \(prefers-color-scheme:dark\)/);
    // mask 中的亮度色不被映射，id 加前缀
    expect(svg).toMatch(/<mask id="demo-mask-a">.*fill="#fff".*fill="#000"/);
    expect(svg).toContain('mask="url(#demo-mask-a)"');
    // 遮罩之外不应残留十六进制颜色属性
    const outside = svg.replace(/<mask\b[\s\S]*?<\/mask>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '');
    expect(outside).not.toMatch(/(fill|stroke)="#[0-9a-f]{3,6}"/i);
    expect(svg).toContain('<title id="demo-title">演示</title>');
    expect(svg.endsWith('\n')).toBe(true);
  });

  it('非调色板颜色：默认报告，--fix 时吸附', async () => {
    const bad = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="5" height="5" fill="#ff00ff"/></svg>';
    const r1 = await postprocess(bad, { style: 'clean', source: 'b.drawio', idPrefix: 'b', title: 'b' });
    expect(r1.unknownColors).toEqual(['#ff00ff']);
    const r2 = await postprocess(bad, { style: 'clean', source: 'b.drawio', idPrefix: 'b', title: 'b', fix: true });
    expect(r2.unknownColors).toEqual([]);
    expect(r2.svg).toMatch(/fill="var\(--wd-[a-z-]+, #[0-9a-f]{6}\)"/);
  });
});
