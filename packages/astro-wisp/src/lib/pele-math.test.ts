import { describe, expect, it } from 'vitest';
import { createPeleMathResolver, peleMath } from './pele-math';

describe('peleMath', () => {
  it('将 TeX 表达式渲染为带像素尺寸的自包含 SVG', () => {
    const res = peleMath('I_{t,s}', 16);
    expect(res).not.toBeNull();
    expect(res && 'svg' in res).toBe(true);
    if (!res || !('svg' in res)) return;

    expect(res.width).toBeGreaterThan(0);
    expect(res.height).toBeGreaterThan(0);
    expect(Number.isFinite(res.width)).toBe(true);
    expect(Number.isFinite(res.height)).toBe(true);
    expect(res.svg).toContain('<svg');
    expect(res.svg).toContain('<path');
    // fontCache: 'none'，不含 <defs> / <use>
    expect(res.svg).not.toContain('<defs');
    expect(res.svg).not.toContain('<use');
    // 继承主题颜色，不带内联 style 与 role="img"
    expect(res.svg).toContain('currentColor');
    expect(res.svg).not.toContain('style=');
    expect(res.svg).not.toContain('role="img"');
    expect(res.svg).toContain('aria-hidden="true"');
  });

  it('支持常见深度学习与线性代数公式（分式、花体、粗体）', () => {
    for (const tex of [
      'p_t',
      '\\frac{QK^\\top}{\\sqrt{d_k}}',
      '\\mathcal{S}_t',
      '\\mathbf{h}_t \\in \\mathbb{R}^d',
    ]) {
      const res = peleMath(tex, 16);
      expect(res).not.toBeNull();
      expect(res && 'svg' in res && res.svg.includes('<path')).toBe(true);
    }
  });

  it('按 (display, size, tex) 缓存并随字号缩放尺寸', () => {
    const a = peleMath('p_t', 16);
    const b = peleMath('p_t', 16);
    const smaller = peleMath('p_t', 14);
    expect(a).toBe(b);
    expect(a).not.toBeNull();
    expect(smaller).not.toBeNull();
    if (!a || !smaller) return;
    expect(a.width).toBeGreaterThan(smaller.width);
    expect(a.height).toBeGreaterThan(smaller.height);
  });

  it('支持 display: true 模式', () => {
    const inlineResolver = createPeleMathResolver({ display: false });
    const displayResolver = createPeleMathResolver({ display: true });
    const inline = inlineResolver('\\sum_{i=1}^n x_i', 16);
    const block = displayResolver('\\sum_{i=1}^n x_i', 16);
    expect(inline).not.toBeNull();
    expect(block).not.toBeNull();
    if (!inline || !block) return;
    expect(block.height).toBeGreaterThan(inline.height);
  });

  it('非法 TeX 或空输入返回 null 而不抛错', () => {
    expect(peleMath('', 16)).toBeNull();
    expect(peleMath('   ', 16)).toBeNull();
    expect(peleMath('p_t', 0)).toBeNull();
    expect(peleMath('\\undefinedmacro{', 16)).toBeNull();
    expect(peleMath('\\frac{1}{', 16)).toBeNull();
  });

  it('禁用 html/action 等不安全扩展命令', () => {
    const res = peleMath('\\href{javascript:alert(1)}{x}', 16);
    expect(res).toBeNull();
  });
});
