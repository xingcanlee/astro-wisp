import { describe, expect, it } from 'vitest';
import { excalidrawTitleDesc, outputPathFor, stem, styleOf } from './build.ts';

describe('build 辅助函数', () => {
  it('styleOf', () => {
    expect(styleOf('/x/a.excalidraw')).toBe('hand');
    expect(styleOf('/x/a.drawio')).toBe('clean');
    expect(() => styleOf('/x/a.svg')).toThrow(/不支持/);
  });
  it('输出路径：首页 <name>.wisp.svg，其余 <name>.page-N.wisp.svg', () => {
    expect(stem('/p/transformer-block.drawio')).toBe('transformer-block');
    expect(outputPathFor('/p/diagrams/a.drawio')).toBe('/p/diagrams/a.wisp.svg');
    expect(outputPathFor('/p/diagrams/a.drawio', 1)).toBe('/p/diagrams/a.page-2.wisp.svg');
    expect(outputPathFor('/p/diagrams/a.excalidraw', 0, '/out')).toBe('/out/a.wisp.svg');
  });
  it('excalidrawTitleDesc：最大字号的独立文字作标题，其余按位置排序作描述', () => {
    const scene = {
      elements: [
        { type: 'text', text: '注', fontSize: 12, x: 0, y: 300 },
        { type: 'text', text: '自注意力', fontSize: 18, x: 0, y: 0 },
        { type: 'text', text: 'Q', fontSize: 14, containerId: 'q', x: 0, y: 50 },
        { type: 'text', text: 'gone', fontSize: 30, isDeleted: true },
      ],
    };
    expect(excalidrawTitleDesc(scene, '/a/attention-flow.excalidraw')).toEqual({ title: '自注意力', desc: 'Q；注' });
  });
  it('没有标题级文字时回落到文件名', () => {
    expect(excalidrawTitleDesc({ elements: [] }, '/a/attention-flow.excalidraw').title).toBe('attention flow');
  });
});
