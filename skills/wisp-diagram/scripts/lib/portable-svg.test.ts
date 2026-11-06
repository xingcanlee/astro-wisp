import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toPortableSvg } from './portable-svg.ts';
import { nearestToken, resolveColor, wdVars } from './palette.ts';

const fx = (n: string) => readFileSync(new URL(`../__fixtures__/${n}`, import.meta.url), 'utf8');

describe('palette', () => {
  it('nearestToken snaps close blue to blue stroke', () => {
    const n = nearestToken('#2563eb');
    expect(n.token.name).toBe('blue');
    expect(n.deltaE).toBeGreaterThan(0);
  });
  it('resolves semantic and hue names', () => {
    expect(resolveColor('q')?.hue).toBe('blue');
    expect(resolveColor('amber')?.stroke.light).toBe('#b45309');
    expect(resolveColor('nope')).toBeNull();
  });
  it('builds var tables for both modes', () => {
    expect(wdVars('light')['--wd-blue-fill']).toBe('#dbeafe');
    expect(wdVars('dark')['--wd-blue']).toBe('#60a5fa');
  });
});

describe('toPortableSvg: excalidraw export', () => {
  const r = toPortableSvg(fx('excalidraw-export.svg'), { style: 'hand' });
  it('maps palette colors and reports the unknown one', () => {
    expect(r.svg).toContain('fill="var(--wd-blue-fill, #dbeafe)"');
    expect(r.svg).toContain('stroke="var(--wd-blue, #1d4ed8)"');
    expect(r.svg).toContain('stroke="var(--wd-green, #15803d)"'); // rgb()
    expect(r.svg).toContain('stroke="var(--wd-fg, #1d1d1f)"'); // #1e1e1e
    expect(r.svg).toContain('fill="var(--wd-bg, #fcfcfb)"'); // #FFF
    expect(r.svg).toContain('fill: var(--wd-fg, #1d1d1f)'); // style, #000
    expect(r.unknownColors).toEqual(['#2563eb']);
    expect(r.svg).toContain('stroke="#2563eb"');
  });
  it('removes the background rect, adds class and scoped style', () => {
    expect(r.svg).not.toContain('width="320" height="200" fill');
    expect(r.svg).toMatch(/<svg [^>]*class="wisp-d"/);
    expect(r.svg).toContain('@media (prefers-color-scheme:dark){.wisp-d{');
    expect(r.svg).toContain('data-style="hand"');
  });
  it('unifies fonts and leaves @font-face alone', () => {
    expect(r.svg).toContain('font-family="var(--wd-font-hand)"');
    expect(r.svg).toContain('font-family: var(--wd-font-hand)');
    expect(r.svg).toContain('font-family: "Virgil"; src:');
  });
  it('is idempotent', () => {
    expect(toPortableSvg(r.svg).svg).toBe(r.svg);
  });
  it('matches snapshot', () => expect(r.svg).toMatchSnapshot());
  it('fix snaps unknown colors to the nearest token', () => {
    const f = toPortableSvg(fx('excalidraw-export.svg'), { fix: true });
    expect(f.unknownColors).toEqual([]);
    expect(f.svg).toContain('stroke="var(--wd-blue, #1d4ed8)"');
    expect(f.warnings.some((w) => w.startsWith('snapped #2563eb'))).toBe(true);
  });
});

describe('toPortableSvg: drawio export', () => {
  const r = toPortableSvg(fx('drawio-export.svg'), { style: 'clean' });
  it('strips background and maps colors in attrs, style and html', () => {
    expect(r.svg).not.toContain('background');
    expect(r.svg).not.toContain('fill="#ffffff"');
    expect(r.svg).toContain('stroke="var(--wd-fg, #1d1d1f)"');
    expect(r.svg).toContain('stroke: var(--wd-fg, #1d1d1f)');
    expect(r.svg).toContain('color: var(--wd-fg, #1d1d1f)');
    expect(r.svg).toContain('font-family: var(--wd-font-sans)');
    expect(r.unknownColors).toEqual(['#ff00ff']);
  });
  it('matches snapshot', () => expect(r.svg).toMatchSnapshot());
});

describe('toPortableSvg: mask / clipPath / defs', () => {
  const r = toPortableSvg(fx('excalidraw-mask.svg'));
  it('leaves mask and clipPath contents untouched', () => {
    expect(r.svg).toContain('<mask id="m1"><rect x="0" y="0" width="320" height="200" fill="#ffffff"></rect><rect x="100" y="40" width="40" height="20" fill="#000000"></rect></mask>');
    expect(r.svg).toContain('<clipPath id="c1"><rect x="0" y="0" width="320" height="200" fill="#ffffff"></rect></clipPath>');
    expect(r.unknownColors).toEqual([]);
  });
  it('removes only the top-level background and keeps the masked path', () => {
    expect(r.warnings).toContain('removed background rect');
    expect(r.svg).toContain('stroke="var(--wd-blue, #1d4ed8)" stroke-width="1.5" mask="url(#m1)"');
    expect(r.svg.match(/<rect x="0" y="0" width="320" height="200" fill="#ffffff">/g)).toHaveLength(2); // mask + clipPath only; the bare defs rect is mapped, not removed
  });
  it('is idempotent', () => expect(toPortableSvg(r.svg).svg).toBe(r.svg));
});
