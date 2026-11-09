import type { Heading, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

interface AstroFileData {
  astro?: { frontmatter?: Record<string, unknown> };
}

/**
 * 把标题节点的行内内容还原为接近源码的纯文本：
 * 行内公式恢复为 `$...$`，其余标记（加粗、行内代码等）取其文字内容。
 * 渲染后的 hast 经 rehype-katex 处理后再提取纯文本会把公式搅乱（如 $w$ → "www"），
 * 目录等需要纯文本标题的场景必须用渲染前的形式。
 */
function rawText(nodes: PhrasingContent[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text' || node.type === 'inlineCode') out += node.value;
    else if (node.type === 'inlineMath') out += `$${node.value}$`;
    else if ('children' in node && Array.isArray((node as { children?: unknown }).children)) {
      out += rawText((node as { children: PhrasingContent[] }).children);
    }
  }
  return out;
}

/**
 * remark 插件：按文档顺序收集所有标题的"渲染前"纯文本，
 * 写入 `file.data.astro.frontmatter.tocHeadingTexts`（字符串数组）。
 * 路由层用它按序号覆盖 render() 返回的 headings[i].text，
 * 供 Toc 组件在构建时用 KaTeX 渲染标题中的行内公式。
 */
const remarkHeadingText: Plugin<[], Root> = () => (tree, file) => {
  const texts: string[] = [];
  visit(tree, 'heading', (node: Heading) => {
    texts.push(rawText(node.children));
  });

  const data = file.data as AstroFileData;
  data.astro ??= {};
  data.astro.frontmatter ??= {};
  data.astro.frontmatter.tocHeadingTexts = texts;
};

export default remarkHeadingText;
