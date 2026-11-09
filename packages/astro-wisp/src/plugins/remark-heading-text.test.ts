import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { VFile } from 'vfile';
import remarkHeadingText from './remark-heading-text';

async function textsOf(md: string): Promise<string[]> {
  const processor = unified().use(remarkParse).use(remarkMath).use(remarkHeadingText);
  const file = new VFile(md);
  const tree = processor.parse(file);
  await processor.run(tree, file);
  return (file.data as { astro?: { frontmatter?: { tocHeadingTexts?: string[] } } }).astro?.frontmatter?.tocHeadingTexts as string[];
}

describe('remarkHeadingText 插件', () => {
  it('标题中的行内公式还原为原始文本，而非渲染后搅乱的文本', async () => {
    expect(await textsOf('## 从 $q$ 到 $\\mathcal{H}^{res}$')).toEqual(['从 $q$ 到 $\\mathcal{H}^{res}$']);
  });

  it('无公式的标题原样返回，含加粗/行内代码时取文字内容', async () => {
    expect(await textsOf('## 普通 **加粗** 和 `code`')).toEqual(['普通 加粗 和 code']);
  });

  it('按文档顺序收集所有深度', async () => {
    expect(await textsOf('# 一\n\n## 二\n\n### 三')).toEqual(['一', '二', '三']);
  });

  it('块级公式与段落不影响结果', async () => {
    expect(await textsOf('## 标题\n\n$$\nx=1\n$$\n\n段落 $y$')).toEqual(['标题']);
  });
});
