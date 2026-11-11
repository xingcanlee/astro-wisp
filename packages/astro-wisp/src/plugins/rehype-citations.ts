import type { Element, ElementContent, Root } from 'hast';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';
import { iconHast } from '../lib/icons';

export interface RehypeCitationsOptions {
  /** 站点语言（config.site.lang）；文章 frontmatter 的 lang 优先 */
  lang?: string;
}

const addClass = (node: Element, name: string) => {
  const cls: unknown = node.properties.className;
  const list = Array.isArray(cls)
    ? cls.map(String)
    : typeof cls === 'string'
      ? cls.split(/\s+/)
      : [];
  if (!list.includes(name)) node.properties.className = [...list, name];
};

/**
 * GFM 脚注 → 引用（作者语法不变：`正文[^key]` + `[^key]: 出处`）。
 * - 文内标记：sup 加 .wisp-cite，链接加可读的 aria-label（「参考 3」/「Reference 3」）；
 *   紧挨着的引用另加 .wisp-cite--joined（后面紧跟引用）/ .wisp-cite--cont（紧跟在引用后面），样式合并成 [1, 2]
 * - 文末列表：section 加 .wisp-notes；remark-gfm 的读屏专用标题（sr-only "Footnotes"）改成按语言的可见标题
 *   （「参考与注释」/「References」），它不是正文的直接子元素，不参与 h2 编号；Post 布局也把它排除在目录外
 * - 回链：「↩」字符换成 Lucide arrow-up 图标（构建期内联 SVG），按语言写 aria-label；
 *   同一条被引用多次时，每个回链带序号（1、2…）以便区分
 */
export default function rehypeCitations(options: RehypeCitationsOptions = {}) {
  return (tree: Root, file: VFile) => {
    const fm = (file.data as { astro?: { frontmatter?: { lang?: unknown } } }).astro?.frontmatter;
    const lang = typeof fm?.lang === 'string' && fm.lang ? fm.lang : (options.lang ?? 'zh-CN');
    const zh = /^zh\b/i.test(lang);

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'sup' && isCite(node)) {
        const a = node.children[0] as Element;
        const n = textOf(a).trim();
        a.properties.ariaLabel = zh ? `参考 ${n}` : `Reference ${n}`;
        addClass(node, 'wisp-cite');
        // 紧挨着的引用（中间没有任何文字，空白也不算）合并成 [1, 2]：前一个画逗号，后一个不画左括号。
        // CSS 的相邻选择器会跳过中间的文字，所以在这里按真实的兄弟节点判断。
        const next = parent && index !== undefined ? parent.children[index + 1] : undefined;
        if (next && next.type === 'element' && next.tagName === 'sup' && isCite(next)) {
          addClass(node, 'wisp-cite--joined');
          addClass(next, 'wisp-cite');
          addClass(next, 'wisp-cite--cont');
        }
        return;
      }
      if (node.tagName !== 'section' || node.properties?.dataFootnotes === undefined) return;
      addClass(node, 'wisp-notes');
      node.properties.ariaLabelledBy = ['footnote-label'];
      const label = node.children.find(
        (c): c is Element => c.type === 'element' && /^h[1-6]$/.test(c.tagName),
      );
      if (label) {
        label.properties.className = ['wisp-notes-title'];
        label.properties.id ??= 'footnote-label';
        label.children = [{ type: 'text', value: zh ? '参考与注释' : 'References' }];
      }
      visit(node, 'element', (li) => {
        if (li.tagName !== 'li') return;
        const backs: Element[] = [];
        visit(li, 'element', (a) => {
          if (a.tagName === 'a' && a.properties?.dataFootnoteBackref !== undefined) backs.push(a);
        });
        backs.forEach((a, i) => {
          const many = backs.length > 1;
          a.properties.className = ['wisp-backref'];
          a.properties.ariaLabel = zh
            ? many
              ? `返回正文第 ${i + 1} 处引用`
              : '返回正文'
            : many
              ? `Back to citation ${i + 1} in text`
              : 'Back to text';
          const children: ElementContent[] = [iconHast('arrow-up')];
          if (many)
            children.push({
              type: 'element',
              tagName: 'span',
              properties: { className: ['wisp-backref-n'], ariaHidden: 'true' },
              children: [{ type: 'text', value: String(i + 1) }],
            });
          a.children = children;
        });
        return 'skip';
      });
      return 'skip';
    });
  };
}

function isCite(node: Element): boolean {
  const a = node.children.length === 1 ? node.children[0] : undefined;
  return a?.type === 'element' && a.tagName === 'a' && a.properties?.dataFootnoteRef !== undefined;
}

function textOf(node: Element | ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}
