import { describe, expect, it } from 'vitest';
import { escapeHtml, segmentTitleWords } from './title';

describe('title segmentation', () => {
  it('avoids inserting <wbr> before Kinsoku punctuation or after opening brackets', () => {
    const { html, segmented } = segmentTitleWords(
      'DeepSeek Sparse Attention（DSA）：闪电索引器与 Top-k 稀疏注意力',
      'zh-CN',
    );
    expect(segmented).toBe(true);
    expect(html).not.toContain('（<wbr>');
    expect(html).not.toContain('<wbr>）');
    expect(html).not.toContain('<wbr>：');
    expect(html).not.toContain('Top<wbr>-');
    expect(html).not.toContain('-<wbr>k');
    expect(html).toContain('）：<wbr>闪电');
    expect(html).toContain('<wbr>与 Top-k');
    expect(html).toContain('Attention<wbr>（DSA）：');
  });

  it('keeps multi-character Chinese words intact at word boundaries', () => {
    const { html, segmented } = segmentTitleWords('与矩阵吸收', 'zh-CN');
    expect(segmented).toBe(true);
    expect(html).toBe('与<wbr>矩阵<wbr>吸收');
  });

  it('skips segmentation and escapes HTML for non-Chinese titles', () => {
    const { html, segmented } = segmentTitleWords('A & B <C>', 'en');
    expect(segmented).toBe(false);
    expect(html).toBe(escapeHtml('A & B <C>'));
  });
});
