import { describe, expect, it } from 'vitest';
import { _test, collectSvgText, embedFonts, inRanges, parseUnicodeRange, shardsFor } from './fonts.ts';

describe('parseUnicodeRange', () => {
  it('单点、区间、通配符', () => {
    expect(parseUnicodeRange('U+20-7e, U+4E00, U+4??')).toEqual([[0x20, 0x7e], [0x4e00, 0x4e00], [0x400, 0x4ff]]);
    expect(inRanges(0x41, parseUnicodeRange('U+20-7e'))).toBe(true);
    expect(inRanges(0x4e2d, parseUnicodeRange('U+20-7e'))).toBe(false);
  });
});

describe('collectSvgText', () => {
  it('只收集可见文字，忽略 style/title/desc，解码实体', () => {
    const svg = '<svg><title>标题</title><desc>描述</desc><style>.a{}</style><text>A&amp;B</text><foreignObject><div>中文</div></foreignObject></svg>';
    const chars = collectSvgText(svg);
    expect([...chars].sort().join('')).toBe([...'A&B中文'].sort().join(''));
    expect(_test.decodeEntities('&#x4e2d;&#25991;')).toBe('中文');
  });
});

describe('字体分片', () => {
  it('Excalifont 从 Excalidraw 产物中取到 unicode-range 分片', () => {
    const s = shardsFor('Excalifont');
    expect(s.length).toBeGreaterThan(1);
    expect(s.some((x) => inRanges(0x41, x.ranges))).toBe(true);
  });
  it('Noto Sans SC 覆盖常用汉字', () => {
    expect(shardsFor('Noto Sans SC').some((x) => inRanges('注'.codePointAt(0)!, x.ranges))).toBe(true);
  });
});

describe('embedFonts', () => {
  it('hand 风格嵌入 Excalifont + Noto SC 子集，幂等', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text font-family="var(--wd-font-hand)">Q 注意力</text></svg>';
    const r = await embedFonts(svg);
    expect(r.families).toEqual(['Excalifont', 'Noto Sans SC']);
    expect(r.svg).toMatch(/<style data-wisp-fonts="1">@font-face\{font-family:"Excalifont"/);
    expect(r.svg).toContain('font-family:"Noto Sans SC"');
    expect(r.svg).toContain('data:font/woff2;base64,');
    expect(r.bytes).toBeGreaterThan(0);
    expect(r.bytes).toBeLessThan(200_000);
    const again = await embedFonts(r.svg);
    expect(again.svg.match(/data-wisp-fonts/g)).toHaveLength(1);
  }, 60_000);
});
