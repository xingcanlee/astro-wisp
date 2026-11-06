import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { lintDrawio, lintExcalidraw } from './lib/lint.ts';
import { isPaletteColor } from './lib/palette.ts';

const ASSETS = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'assets');
const read = (f: string) => readFileSync(join(ASSETS, f), 'utf8');

describe('wisp.excalidrawlib', () => {
  const lib = JSON.parse(read('wisp.excalidrawlib')) as {
    type: string; version: number; libraryItems: Array<{ id: string; name: string; status: string; elements: Array<Record<string, unknown>> }>;
  };
  it('结构合法', () => {
    expect(lib.type).toBe('excalidrawlib');
    expect(lib.version).toBe(2);
    expect(lib.libraryItems.length).toBeGreaterThanOrEqual(30);
    const ids = new Set<string>();
    for (const it of lib.libraryItems) {
      expect(ids.has(it.id)).toBe(false);
      ids.add(it.id);
      expect(it.name).toBeTruthy();
      expect(it.elements.length).toBeGreaterThan(0);
      for (const el of it.elements) {
        expect(typeof el.id).toBe('string');
        expect(typeof el.type).toBe('string');
        expect(typeof el.x).toBe('number');
      }
    }
  });
  it('覆盖 8 个 hue 的矩形、椭圆、菱形及箭头、分组框、文字', () => {
    const types = new Set(lib.libraryItems.flatMap((i) => i.elements.map((e) => e.type)));
    for (const t of ['rectangle', 'ellipse', 'diamond', 'arrow', 'text']) expect(types.has(t)).toBe(true);
    for (const kind of ['节点', '椭圆', '菱形']) expect(lib.libraryItems.filter((i) => i.name.startsWith(kind)).length).toBeGreaterThanOrEqual(8);
    for (const n of ['分组框', '标题文字']) expect(lib.libraryItems.some((i) => i.name.startsWith(n))).toBe(true);
  });
  it('所有颜色都在调色板中，且没有 lint error', () => {
    for (const it of lib.libraryItems) {
      for (const el of it.elements) {
        for (const k of ['strokeColor', 'backgroundColor'] as const) {
          const v = el[k];
          if (typeof v === 'string' && v !== 'transparent') expect(isPaletteColor(v), `${it.name} ${k}=${v}`).toBe(true);
        }
      }
      const errors = lintExcalidraw({ elements: it.elements }).filter((i) => i.level === 'error');
      expect(errors, it.name).toEqual([]);
    }
  });
});

describe('wisp-drawio-library.xml', () => {
  const raw = read('wisp-drawio-library.xml').trim();
  it('是 <mxlibrary> 包裹的 JSON 数组', () => {
    expect(raw.startsWith('<mxlibrary>') && raw.endsWith('</mxlibrary>')).toBe(true);
  });
  const items = JSON.parse(raw.slice('<mxlibrary>'.length, -'</mxlibrary>'.length)) as Array<{ xml: string; w: number; h: number; title: string }>;
  it('每项有 xml/w/h/title，XML 可解析', () => {
    expect(items.length).toBeGreaterThanOrEqual(30);
    for (const it of items) {
      expect(it.title).toBeTruthy();
      expect(it.w).toBeGreaterThan(0);
      expect(it.h).toBeGreaterThanOrEqual(0);
      expect(XMLValidator.validate(it.xml), it.title).toBe(true);
      const parsed = new XMLParser({ ignoreAttributes: false }).parse(it.xml);
      expect(parsed.mxGraphModel?.root?.mxCell?.length, it.title).toBeGreaterThanOrEqual(3);
    }
  });
  it('所有颜色都在调色板中，且无阴影、渐变', () => {
    for (const it of items) {
      const bad = lintDrawio(it.xml).filter((i) => i.level === 'error');
      expect(bad, it.title).toEqual([]);
    }
  });
});

describe('drawio-config.json', () => {
  const cfg = JSON.parse(read('drawio-config.json')) as { presetColors: string[]; defaultColors: string[] };
  it('颜色全部来自调色板', () => {
    expect(cfg.presetColors.length).toBeGreaterThan(8);
    for (const c of [...cfg.presetColors, ...cfg.defaultColors]) expect(isPaletteColor(`#${c}`), c).toBe(true);
  });
  it('JSON 中的其他颜色值也在调色板中', () => {
    const hexes = read('drawio-config.json').match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    for (const h of hexes) expect(isPaletteColor(h), h).toBe(true);
  });
});
