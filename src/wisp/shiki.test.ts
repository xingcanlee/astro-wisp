import { describe, it, expect } from 'vitest';
import { createShikiHighlighter } from '@astrojs/markdown-remark/shiki';
import { wispShikiConfig } from './shiki';
import { wispConfigSchema } from './config';

const cfg = (lineNumbers: boolean) => wispConfigSchema.parse({ features: { lineNumbers } });

async function render(code: string, lang: string, lineNumbers = true) {
  const c = wispShikiConfig(cfg(lineNumbers));
  const h = await createShikiHighlighter({ themes: c.themes as any, langs: [lang] as any });
  return h.codeToHtml(code, lang, { defaultColor: c.defaultColor, transformers: c.transformers });
}

describe('wispShikiConfig', () => {
  it('双主题且无 defaultColor', async () => {
    const html = await render('const a = 1', 'ts');
    expect(html).toContain('--shiki-light:');
    expect(html).toContain('--shiki-dark:');
    expect(html).not.toMatch(/style="color:#/);
  });
  it('语言标签与 data-language', async () => {
    const html = await render('const a = 1', 'ts');
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('class="wisp-lang"');
  });
  it('lineNumbers 开关', async () => {
    expect(await render('a', 'ts', true)).toContain('wisp-ln');
    expect(await render('a', 'ts', false)).not.toContain('wisp-ln');
  });
  it('行号不进入文本内容（由 CSS counter 生成）', async () => {
    const html = await render('a\nb', 'ts');
    expect((html.match(/class="line/g) ?? []).length).toBe(2);
  });
  it('[!code ++] 标记被剥除并加 class', async () => {
    const html = await render('a // [!code ++]\nb # [!code --]\nc', 'ts');
    expect(html).not.toContain('[!code');
    expect(html).toContain('line diff add');
    expect(html).toContain('line diff remove');
  });
  it('低对比度色值的 token 加 tok-low', async () => {
    const html = await render('// hi\nconst a = 1', 'ts');
    expect(html).toContain('tok-low');
    expect(html).toMatch(/class="tok-low"[^>]*>\/\/ hi|tok-low[^>]*>\/\/ hi/);
  });
  it('diff 语言按 +/- 着色', async () => {
    const html = await render('+x\n-y\n z', 'diff');
    expect(html).toContain('diff add');
    expect(html).toContain('diff remove');
  });
});
