import { afterEach, describe, expect, it } from 'vitest';
import { chooseDrawioMethod, cleanDrawioSvg, drawioPageLabels, drawioPages, drawioUnavailableMessage, stripLightDark } from './drawio.ts';

const XML = `<mxfile><diagram id="a" name="encoder"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="多头注意力&lt;br&gt;Multi-Head Attention" style="html=1;" vertex="1" parent="1"/>
<mxCell id="3" value="Add &amp;amp; Norm" vertex="1" parent="1"/></root></mxGraphModel></diagram>
<diagram id="b" name="数据流"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="e" value="矩阵乘" edge="1" parent="1"/></root></mxGraphModel></diagram></mxfile>`;

describe('stripLightDark', () => {
  it('取第一个参数，支持嵌套括号', () => {
    expect(stripLightDark('fill: light-dark(rgb(1, 2, 3), rgb(4, 5, 6));')).toBe('fill: rgb(1, 2, 3);');
    expect(stripLightDark('color: light-dark(#1d1d1f, #d4d4d6)')).toBe('color: #1d1d1f');
    expect(stripLightDark('a light-dark(#fff, var(--x, #121212)) b')).toBe('a #fff b');
    expect(stripLightDark('no-op')).toBe('no-op');
  });
});

describe('cleanDrawioSvg', () => {
  const raw = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" style="background: transparent; color-scheme: light;" viewBox="0 0 10 10" id="ge-svg-abc" content="&lt;mxfile/&gt;"><style type="text/css">@supports (color: light-dark(#000, #fff)) { #ge-svg-abc { --ge-adaptive-fg: light-dark(#000000, var(--ge-light-color, #ffffff)); } }</style><rect fill="#dbeafe" stroke="#1d4ed8" style="fill: light-dark(rgb(219, 234, 254), rgb(26, 39, 56)); stroke: light-dark(rgb(29, 78, 216), rgb(129, 171, 255));"/><text fill="#000000" style="fill: var(--ge-adaptive-fg, #000000);">x</text><div style="color: light-dark(#1d1d1f, #d4d4d6); font-size: 12px"></div></svg>`;
  const out = cleanDrawioSvg(raw);
  it('去掉自适应暗色样式、随机 id、内嵌源数据', () => {
    expect(out).not.toContain('light-dark');
    expect(out).not.toContain('--ge-');
    expect(out).not.toContain('ge-svg-abc');
    expect(out).not.toContain('content=');
    expect(out).not.toContain('<?xml');
  });
  it('属性已有 fill/stroke 时删除 style 中的同名声明', () => {
    expect(out).toContain('<rect fill="#dbeafe" stroke="#1d4ed8"/>');
    expect(out).toContain('<text fill="#000000">');
  });
  it('HTML 标签里的 color 还原为浅色字面量', () => {
    expect(out).toContain('color: #1d1d1f');
    expect(out).toContain('font-size: 12px');
  });
});

describe('drawio 页面', () => {
  const xml = XML;
  it('列出页面（含中文页名）', () => {
    expect(drawioPages(xml)).toEqual([{ index: 0, name: 'encoder' }, { index: 1, name: '数据流' }]);
  });
  it('无 name 时给默认页名', () => {
    expect(drawioPages('<mxfile><diagram id="a"></diagram></mxfile>')).toEqual([{ index: 0, name: 'Page-1' }]);
  });
  it('提取页面文字（去 HTML、解实体）', () => {
    const labels = drawioPageLabels(xml, 0);
    expect(labels).toContain('多头注意力 Multi-Head Attention');
    expect(labels).toContain('Add & Norm');
    expect(drawioPageLabels(xml, 1)).toContain('矩阵乘');
  });
});

describe('导出方式探测', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('强制指定不可用的方式时给出安装说明', () => {
    process.env.WISP_DRAWIO_BIN = '/nonexistent/drawio';
    expect(() => chooseDrawioMethod('cli')).toThrow(/drawio-desktop/);
  });
  it('未知方式报错', () => {
    expect(() => chooseDrawioMethod('nope' as never)).toThrow(/未知/);
  });
  it('全部不可用的提示列出三种安装方法', () => {
    const msg = drawioUnavailableMessage([
      { method: 'cli', ok: false, detail: 'x' }, { method: 'docker', ok: false, detail: 'y' }, { method: 'browser', ok: false, detail: 'z' },
    ]);
    expect(msg).toMatch(/drawio-desktop/);
    expect(msg).toMatch(/docker pull rlespinasse\/drawio-export/);
    expect(msg).toMatch(/WISP_DRAWIO_VIEWER/);
  });
});
