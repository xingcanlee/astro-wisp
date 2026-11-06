import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { genAll } from "../../scripts/gen-tokens";
import { genTokens, genPele, genDiagram } from "./generate";
import { checkContrast } from "./contrast";
import { mergePalette, palette, resolveColor, nearestToken } from "./palette";

describe('palette', () => {
  it('跳过 $ 注释键', () => {
    expect(JSON.stringify(palette)).not.toContain('"$comment"');
    expect(Object.keys(palette.color.hue)).toHaveLength(8);
  });
  it('resolveColor', () => {
    expect(resolveColor('fg', 'light')).toBe('#1d1d1f');
    expect(resolveColor('fg', 'dark')).toBe('#e6e6e3');
    expect(resolveColor('blue', 'light')).toBe('#1d4ed8');
    expect(resolveColor('blue-fill', 'dark')).toBe('#1b2740');
    expect(resolveColor('q', 'light')).toBe('#1d4ed8');
    expect(resolveColor('k', 'dark')).toBe('#fbbf24');
    expect(() => resolveColor('nope')).toThrow();
  });
  it('nearestToken', () => {
    expect(nearestToken('#1d4ed8')).toMatchObject({ name: 'blue', deltaE: 0 });
    expect(nearestToken('#1e4fd9').name).toBe('blue');
    expect(nearestToken('#dbeafe').name).toBe('blue-fill');
  });
});

describe('生成', () => {
  it('确定性', () => {
    expect(genAll()).toEqual(genAll());
  });
  it('tokens.css 结构', () => {
    const css = genTokens();
    expect(css).toContain('自动生成，勿手改');
    expect(css).toContain('--wisp-bg: #fcfcfb;');
    expect(css).toContain('--wisp-bg: #111214;');
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('--wisp-sem-q: var(--wisp-hue-blue);');
    expect(css).toContain('--wisp-sem-q-fill: var(--wisp-hue-blue-fill);');
    expect(css).toContain('"Noto Sans SC Variable"');
    expect(css).not.toContain('$comment');
  });
  it('pele.css', () => {
    const css = genPele();
    expect(css).toContain('--pele-series-1: var(--wisp-hue-blue);');
    expect(css).toContain('--pele-series-8: var(--wisp-hue-slate);');
  });
  it('diagram.css', () => {
    const css = genDiagram();
    expect(css).toContain('[data-theme] .wisp-d');
    expect(css).toContain('--wd-blue-fill: var(--wisp-hue-blue-fill);');
    expect(css).toContain('--wd-font-hand: var(--wisp-font-hand);');
  });
  it('skills 副本与源一致', () => {
    expect(readFileSync(new URL('../../skills/wisp-diagram/palette.json', import.meta.url), 'utf8')).toBe(readFileSync(new URL('../../design/palette.json', import.meta.url), 'utf8'));
  });
});

describe('覆盖调色板', () => {
  it('深度合并，只改指定键', () => {
    const p = mergePalette({ color: { base: { accent: { light: '#0a5c36', dark: '#5ad19a' } } } });
    expect(p.color.base.accent).toEqual({ light: '#0a5c36', dark: '#5ad19a' });
    expect(p.color.base.fg).toEqual(palette.color.base.fg);
    expect(Object.keys(p.color.hue)).toEqual(Object.keys(palette.color.hue));
    expect(genTokens(p)).toContain('--wisp-accent: #0a5c36;');
  });
  it('数组整体替换', () => {
    const p = mergePalette({ font: { sans: ['Inter'] } });
    expect(p.font.sans).toEqual(['Inter']);
    expect(p.font.mono).toEqual(palette.font.mono);
  });
  it('提交的生成文件与默认调色板一致（忘了跑 pnpm tokens 时失败）', () => {
    for (const [rel, content] of Object.entries(genAll())) {
      expect(readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8'), rel).toBe(content);
    }
  });
});

describe('对比度', () => {
  it('全部 ≥ 4.5', () => {
    const rows = checkContrast();
    expect(rows.length).toBe(2 * (3 + 16));
    expect(rows.filter((r) => !r.pass)).toEqual([]);
  });
});
