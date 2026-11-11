import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { genAll } from '../../scripts/gen-tokens';
import { genTokens, genPele, genDiagram } from './generate';
import { checkContrast } from './contrast';
import { oklch } from 'culori';
import { mergePalette, palette, resolveColor, nearestToken } from './palette';

describe('palette', () => {
  it('跳过 $ 注释键', () => {
    expect(JSON.stringify(palette)).not.toContain('"$comment"');
    expect(Object.keys(palette.color.hue)).toHaveLength(8);
  });
  it('resolveColor', () => {
    expect(resolveColor('fg', 'light')).toBe('#1d1d1f');
    expect(resolveColor('fg', 'dark')).toBe('#e6e6e3');
    expect(resolveColor('blue', 'light')).toBe('#2f5783');
    expect(resolveColor('blue-fill', 'dark')).toBe('#1a2634');
    expect(resolveColor('q', 'light')).toBe('#2f5783');
    expect(resolveColor('k', 'dark')).toBe('#f2c681');
    expect(() => resolveColor('nope')).toThrow();
  });
  it('nearestToken', () => {
    expect(nearestToken('#2f5783')).toMatchObject({ name: 'blue', deltaE: 0 });
    expect(nearestToken('#305884').name).toBe('blue');
    expect(nearestToken('#e8f1fb').name).toBe('blue-fill');
  });
  it('分类色是低彩度的「印刷油墨」，填充是近纸色的淡洗（DESIGN.md Colors）', () => {
    for (const [name, { stroke, fill }] of Object.entries(palette.color.hue)) {
      for (const mode of ['light', 'dark'] as const) {
        expect(oklch(stroke[mode])!.c, `${name} stroke ${mode}`).toBeLessThanOrEqual(0.12);
        expect(oklch(fill[mode])!.c, `${name} fill ${mode}`).toBeLessThanOrEqual(0.04);
      }
      expect(oklch(fill.light)!.l, `${name} fill light`).toBeGreaterThanOrEqual(0.94);
      expect(oklch(fill.dark)!.l, `${name} fill dark`).toBeLessThanOrEqual(0.3);
    }
    // activation 与界面强调色在 light 下是同一种墨
    expect(resolveColor('activation', 'light')).toBe(resolveColor('accent', 'light'));
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
    expect(css).toContain('--pele-series-1-fill: color-mix(in srgb, var(--wisp-hue-blue) 58%');
    expect(css).toContain('--pele-series-8: var(--wisp-hue-slate);');
  });
  it('diagram.css', () => {
    const css = genDiagram();
    expect(css).toContain('[data-theme] .wisp-d');
    expect(css).toContain('--wd-blue-fill: var(--wisp-hue-blue-fill);');
    expect(css).toContain('--wd-font-hand: var(--wisp-font-hand);');
  });
  it('skills 副本与源一致', () => {
    expect(
      readFileSync(new URL('../../skills/wisp-diagram/palette.json', import.meta.url), 'utf8'),
    ).toBe(readFileSync(new URL('../../design/palette.json', import.meta.url), 'utf8'));
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
      const actual = readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8').replace(
        /\r\n/g,
        '\n',
      );
      expect(actual, rel).toBe(content.replace(/\r\n/g, '\n'));
    }
  });
});

describe('对比度', () => {
  it('全部 ≥ 4.5', () => {
    const rows = checkContrast();
    expect(rows.length).toBe(2 * (3 + 24));
    expect(rows.filter((r) => !r.pass)).toEqual([]);
  });
});
