import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * 补齐 Markdown 产物的无障碍与多语种排版属性：
 * - GFM 任务列表的 checkbox 没有可访问名称 → 用所在列表项的文字作 aria-label
 * - KaTeX 块级公式：role=group + aria-label「公式」
 * - 表格包一层 div.wisp-table：表格本身保持 display:table 铺满正文栏，列多时由外层横向滚动
 * - 纯西文 `<em>` / `<i>`（含拉丁字母且不含中日韩文字、未显式写 lang）补 `lang="en"`：
 *   读屏按英语发音（WCAG 3.1.2），中文页里的英文论文名与术语保持真斜体而不打中文着重号
 *
 * 键盘：只有确实横向溢出的容器才是 Tab 停靠点。这里给公式和表格容器写 `tabindex=0 data-wisp-tab`
 * （代码块的 pre 由 shiki.ts 写同样的属性）：这是无 JS 时的回落——不知道是否溢出，就让它们都能用键盘滚动。
 * 有 JS 时 Base 布局的脚本在首帧接管带 data-wisp-tab 的容器：不溢出的去掉 tabindex，溢出的补上
 * tabindex、role 与「…，可横向滚动」的名称，并随窗宽变化增删。
 */
const CJK_SCRIPT_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u;
const LATIN_LETTER_RE = /\p{Script=Latin}/u;

export default function rehypeA11y() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'table') splitCellCode(node);
      if (node.tagName === 'table' && parent && index !== undefined && !isTableWrap(parent)) {
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['wisp-table'], tabIndex: 0, dataWispTab: '' },
          children: [node],
        };
        return 'skip';
      }
      const cls: unknown = node.properties?.className;
      const classes = Array.isArray(cls)
        ? cls.map(String)
        : typeof cls === 'string'
          ? cls.split(/\s+/)
          : [];

      if (classes.includes('katex-display')) {
        node.properties.tabIndex = 0;
        node.properties.dataWispTab = '';
        node.properties.role = 'group';
        node.properties['ariaLabel'] = '公式';
        return 'skip';
      }
      if (classes.includes('katex')) return 'skip';

      if (node.tagName === 'li' && classes.includes('task-list-item')) {
        const input =
          node.children.find(
            (c): c is Element =>
              c.type === 'element' && c.tagName === 'input' && c.properties?.type === 'checkbox',
          ) ?? findCheckbox(node);
        if (input && !input.properties['ariaLabel']) {
          const label = textOf(node).trim().slice(0, 120);
          if (label) input.properties['ariaLabel'] = label;
        }
      }

      if ((node.tagName === 'em' || node.tagName === 'i') && node.properties?.lang === undefined) {
        const text = textOf(node).trim();
        if (LATIN_LETTER_RE.test(text) && !CJK_SCRIPT_RE.test(text)) {
          node.properties.lang = 'en';
        }
      }
    });
  };
}

/**
 * 表格增强：
 * 1. 单元格里的行内代码按空格包进 span.wisp-tok（CSS 里 nowrap），记号之间的空格留在外面——
 *    长表达式只在空格处换行，不会在 `file.py:234-358` 的连字符处断开；复制出来的文字不变。
 * 2. 长描述单元格（视觉宽度 ≥ 22 半角单位，约 11 个汉字以上）标上 data-wisp-prose，
 *    避免在多列数据表里被挤成每行仅三四个字的竖条。
 */
function splitCellCode(table: Element) {
  visit(table, 'element', (cell: Element) => {
    if (cell.tagName !== 'td') return;
    if (cell.properties?.colSpan === undefined && cellVisualWidth(textOf(cell).trim()) >= 22) {
      cell.properties.dataWispProse = '';
    }
    visit(cell, 'element', (code: Element) => {
      if (code.tagName !== 'code') return;
      if (!code.children.every((c) => c.type === 'text')) return 'skip';
      const text = code.children.map((c) => (c as { value: string }).value).join('');
      code.children = text
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part) =>
          /^\s+$/.test(part)
            ? { type: 'text' as const, value: part }
            : {
                type: 'element' as const,
                tagName: 'span',
                properties: { className: ['wisp-tok'] },
                children: [{ type: 'text' as const, value: part }],
              },
        );
      return 'skip';
    });
    return 'skip';
  });
}

function cellVisualWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    w += CJK_SCRIPT_RE.test(ch) || (ch.codePointAt(0) ?? 0) > 0x2e80 ? 2 : 1;
  }
  return w;
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
