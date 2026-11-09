import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * 补齐 Markdown 产物的无障碍属性：
 * - GFM 任务列表的 checkbox 没有可访问名称 → 用所在列表项的文字作 aria-label
 * - KaTeX 块级公式可能横向滚动 → 容器可键盘聚焦，role=group + aria-label
 * - 表格包一层可聚焦的 div.wisp-table：表格本身保持 display:table 铺满正文栏，列多时由外层横向滚动
 *   （溢出时的 role/aria-label 由 Base 布局的脚本按需补上）
 */
export default function rehypeA11y() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'table' && parent && index !== undefined && !isTableWrap(parent)) {
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['wisp-table'], tabIndex: 0 },
          children: [node],
        };
        return 'skip';
      }
      const cls: unknown = node.properties?.className;
      const classes = Array.isArray(cls) ? cls.map(String) : typeof cls === 'string' ? cls.split(/\s+/) : [];

      if (node.tagName === 'li' && classes.includes('task-list-item')) {
        const input = node.children.find(
          (c): c is Element => c.type === 'element' && c.tagName === 'input' && c.properties?.type === 'checkbox',
        ) ?? findCheckbox(node);
        if (input && !input.properties['ariaLabel']) {
          const label = textOf(node).trim().slice(0, 120);
          if (label) input.properties['ariaLabel'] = label;
        }
      }

      if (classes.includes('katex-display')) {
        node.properties.tabIndex = 0;
        node.properties.role = 'group';
        node.properties['ariaLabel'] = '公式';
      }
    });
  };
}

function isTableWrap(node: { type: string; properties?: Element['properties'] }): boolean {
  if (node.type !== 'element') return false;
  const cls = node.properties?.className;
  return (Array.isArray(cls) ? cls.map(String) : []).includes('wisp-table');
}

function findCheckbox(node: Element): Element | undefined {
  for (const c of node.children) {
    if (c.type !== 'element') continue;
    if (c.tagName === 'input' && c.properties?.type === 'checkbox') return c;
    if (c.tagName === 'p') {
      const hit = findCheckbox(c);
      if (hit) return hit;
    }
  }
}

function textOf(node: Root | Element): string {
  let out = '';
  visit(node, 'text', (t: { value: string }) => {
    out += t.value;
  });
  return out.replace(/\s+/g, ' ');
}
