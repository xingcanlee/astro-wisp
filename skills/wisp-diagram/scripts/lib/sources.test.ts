import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compressDiagram, decompressDiagram, listPages, normalizeDrawio } from './drawio.ts';
import { normalizeExcalidraw } from './excalidraw.ts';
import { applyFixes, lintDrawio, lintExcalidraw } from './lint.ts';
import { main as lintMain } from '../lint.ts';
import { main as normalizeMain } from '../normalize.ts';

const fxUrl = (n: string) => new URL(`../__fixtures__/${n}`, import.meta.url);
const fx = (n: string) => readFileSync(fxUrl(n), 'utf8');

describe('drawio', () => {
  it('round-trips compression', () => {
    const xml = '<mxGraphModel><root><mxCell id="0" value="中文 &amp; é"/></root></mxGraphModel>';
    expect(decompressDiagram(compressDiagram(xml))).toBe(xml);
  });
  it('lists pages', () => {
    expect(listPages(fx('sample-compressed.drawio')).map((p) => [p.name, p.compressed])).toEqual([['Page-1', true], ['Second', true]]);
    expect(listPages(fx('sample-plain.drawio')).every((p) => !p.compressed)).toBe(true);
  });
  it('normalizing compressed equals normalizing plain, and is idempotent', () => {
    const a = normalizeDrawio(fx('sample-compressed.drawio'));
    expect(a).toBe(normalizeDrawio(fx('sample-plain.drawio')));
    expect(normalizeDrawio(a)).toBe(a);
    expect(a).not.toMatch(/<diagram[^>]*>[A-Za-z0-9+/=]{40,}/);
    expect(a).toMatchSnapshot();
  });
});

describe('excalidraw normalize', () => {
  const out = normalizeExcalidraw(fx('sample.excalidraw'));
  const doc = JSON.parse(out);
  it('sorts elements by id and trims appState', () => {
    expect(doc.elements.map((e: any) => e.id)).toEqual(['a3', 'b2', 'c4', 'd5', 't1']);
    expect(doc.appState).toEqual({ viewBackgroundColor: '#ffffff', gridSize: 8 });
  });
  it('is idempotent', () => expect(normalizeExcalidraw(out)).toBe(out));
});

describe('lint excalidraw', () => {
  const issues = lintExcalidraw(fx('sample.excalidraw'));
  it('reports the rules', () => {
    const by = (r: string) => issues.filter((i) => i.rule === r);
    expect(by('palette-color').map((i) => i.elementId)).toEqual(['a3']);
    expect(by('palette-color')[0]!.fix?.to).toBe('#1d4ed8');
    expect(by('font-size').map((i) => i.elementId)).toEqual(['c4']);
    expect(by('grid').map((i) => i.elementId)).toEqual(['a3']);
  });
  it('flags oversize source and gradients', () => {
    const big = JSON.stringify({ elements: [{ id: 'x', type: 'rectangle', x: 0, y: 0, strokeColor: 'linear-gradient(red, blue)' }], files: { a: 'x'.repeat(2.1 * 1024 * 1024) } });
    const r = lintExcalidraw(big).map((i) => i.rule);
    expect(r).toContain('file-size');
    expect(r).toContain('gradient');
  });
  it('applyFixes snaps colors', () => {
    const fixed = applyFixes('excalidraw', fx('sample.excalidraw'), issues);
    expect(lintExcalidraw(fixed).filter((i) => i.rule === 'palette-color')).toEqual([]);
  });
});

describe('lint drawio', () => {
  const src = fx('sample-compressed.drawio');
  const issues = lintDrawio(src);
  it('reports the rules', () => {
    const by = (r: string) => issues.filter((i) => i.rule === r);
    expect(by('palette-color').map((i) => i.elementId)).toEqual(['3']);
    expect(by('shadow')).toHaveLength(1);
    expect(by('gradient')).toHaveLength(1);
    expect(by('font-size').map((i) => i.elementId)).toEqual(['3']);
    expect(by('grid').map((i) => i.elementId)).toEqual(['3']);
    expect(by('compressed')).toHaveLength(1);
  });
  it('applyFixes snaps color, removes shadow/gradient, decompresses', () => {
    const fixed = applyFixes('drawio', src, issues);
    const after = lintDrawio(fixed);
    expect(after.filter((i) => i.level === 'error')).toEqual([]);
    expect(fixed).toContain('fillColor=#');
    expect(listPages(fixed).every((p) => !p.compressed)).toBe(true);
  });
});

describe('CLIs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wd-'));
  for (const f of ['sample.excalidraw', 'sample-compressed.drawio']) copyFileSync(fxUrl(f), join(dir, f));
  const logs: string[] = [];
  const log = (s: string) => logs.push(s);
  it('lint exits 1 on errors, then 0 after --fix', () => {
    expect(lintMain([join(dir, '*.excalidraw'), join(dir, '*.drawio')], log)).toBe(1);
    expect(logs.join('\n')).toMatch(/palette-color/);
    expect(lintMain([join(dir, '*.excalidraw'), join(dir, '*.drawio'), '--fix'], log)).toBe(0);
    expect(lintMain([join(dir, '*.drawio'), '--strict'], log)).toBe(1); // warnings remain
  });
  it('lint exits 2 on no input / bad json', () => {
    expect(lintMain([], log)).toBe(2);
    writeFileSync(join(dir, 'bad.excalidraw'), '{nope');
    expect(lintMain([join(dir, 'bad.excalidraw')], log)).toBe(2);
  });
  it('normalize --check then write', () => {
    const f = join(dir, 'sample.excalidraw');
    writeFileSync(f, fx('sample.excalidraw'));
    expect(normalizeMain([f, '--check'], log)).toBe(1);
    expect(normalizeMain([f], log)).toBe(0);
    expect(normalizeMain([f, '--check'], log)).toBe(0);
  });
});
