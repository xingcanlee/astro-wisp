import { describe, expect, it } from 'vitest';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeA11y from './rehype-a11y';

async function render(md: string): Promise<string> {
  const p = await createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeA11y],
  });
  return (await p.render(md)).code;
}

describe('rehype-a11y', () => {
  it('表格包进 div.wisp-table；tabindex 带 data-wisp-tab（无 JS 回落，有 JS 时只有溢出的保留）', async () => {
    const html = await render('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toMatch(/^<div class="wisp-table" tabindex="0" data-wisp-tab="">\s*<table>/);
  });

  it('块级公式：role=group、名称「公式」，tabindex 同样交给溢出脚本管理', async () => {
    const html = await render('$$\nx=1\n$$');
    expect(html).toContain(
      'class="katex-display" tabindex="0" data-wisp-tab="" role="group" aria-label="公式"',
    );
  });

  it('单元格里的行内代码：按空格切成 nowrap 记号，只在空格处换行', async () => {
    const html = await render('| 式 |\n| - |\n| `f(a, b) / g-h` |\n| `src/x.ts:234-358` |');
    expect(html).toContain(
      '<code><span class="wisp-tok">f(a,</span> <span class="wisp-tok">b)</span> <span class="wisp-tok">/</span> <span class="wisp-tok">g-h</span></code>',
    );
    expect(html).toContain('<code><span class="wisp-tok">src/x.ts:234-358</span></code>');
  });

  it('正文里的行内代码不受影响', async () => {
    expect(await render('看 `a b-c`。')).toContain('<code>a b-c</code>');
  });

  it('任务列表的 checkbox 用列表项文字作名称', async () => {
    expect(await render('- [x] 写测试')).toContain('aria-label="写测试"');
  });

  it('纯西文强调自动标 lang="en"，含中日韩文字的强调保持原语种（着重号）', async () => {
    const html = await render(
      '中文 _强调_ 与 _非阻塞 H2D_ 用着重号；英文 _Conditional Memory: O(1) Lookup_ 与 *et al.* 保持斜体，<em lang="de">Eigenwert</em> 不覆盖。',
    );
    expect(html).toContain('<em>强调</em>');
    expect(html).toContain('<em>非阻塞 H2D</em>');
    expect(html).toContain('<em lang="en">Conditional Memory: O(1) Lookup</em>');
    expect(html).toContain('<em lang="en">et al.</em>');
    expect(html).toContain('<em lang="de">Eigenwert</em>');
  });

  it('长描述单元格自动标记 data-wisp-prose，短数字与短词单元格不标记', async () => {
    const html = await render(
      '| 模型 | MMLU | 稀疏配置 |\n| - | - | - |\n| MoE-27B | 57.4 | 55 路由 + 2 共享 + 5.7B Engram（第 2, 15 层） |',
    );
    expect(html).toContain('<td>MoE-27B</td>');
    expect(html).toContain('<td>57.4</td>');
    expect(html).toContain('<td data-wisp-prose="">55 路由');
  });
});
