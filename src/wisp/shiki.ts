import type { ShikiConfig } from '@astrojs/markdown-remark';
import type { WispConfig } from './config';

type ShikiTransformer = NonNullable<ShikiConfig['transformers']>[number];

/** 取节点内第一个文本字符（穿透嵌套 span） */
function firstChar(node: any): string | undefined {
  for (const c of node.children ?? []) {
    if (c.type === 'text') return c.value[0];
    const r = firstChar(c);
    if (r) return r;
  }
}

// 行尾标记：[!code ++] / [!code --]，前缀可为 //、# 或块注释起始符
const MARK = /\s*(?:\/\/|#|\/\*)\s*\[!code (\+\+|--)\]\s*(?:\*\/)?\s*$/;

/** 剥掉 diff 标记并记录行号；语言为 diff 的块按首字符 +/- 着色 */
export function wispDiffTransformer(): ShikiTransformer {
  return {
    name: 'wisp:diff',
    preprocess(code) {
      const marks = new Map<number, string>();
      const out = code.split('\n').map((l, i) => {
        const m = MARK.exec(l);
        if (!m) return l;
        marks.set(i + 1, m[1]!);
        return l.replace(MARK, '');
      });
      (this.meta as any).__wispDiff = marks;
      return out.join('\n');
    },
    line(node, line) {
      let kind = ((this.meta as any).__wispDiff as Map<number, string> | undefined)?.get(line);
      if (!kind && this.options.lang === 'diff') {
        const c = firstChar(node);
        if (c === '+') kind = '++';
        else if (c === '-') kind = '--';
      }
      if (kind) this.addClassToHast(node, kind === '++' ? 'diff add' : 'diff remove');
    },
  };
}

/**
 * github 主题中在 --wisp-code-bg 上对比度 < 4.5:1 的前景色（小写）：
 * 注释 #6a737d（light 4.45 / dark 3.72）、#22863a 4.28、#d73a49 4.23、#e36209 3.23。
 * 命中的 span 加 class `tok-low`，由 code.css 与 --wisp-fg 混色提亮对比度。
 * 这里只是识别主题输出的色值，不产生任何颜色。
 */
const LOW_CONTRAST = new Set(['#6a737d', '#22863a', '#d73a49', '#e36209']);

export function wispContrastTransformer(): ShikiTransformer {
  return {
    name: 'wisp:contrast',
    span(node, _line, _col, _lineNode, token) {
      const st = (token.htmlStyle ?? {}) as Record<string, string>;
      const hit = [st['--shiki-light'], st['--shiki-dark']].some((c) => c && LOW_CONTRAST.has(c.toLowerCase()));
      if (hit) this.addClassToHast(node, 'tok-low');
    },
  };
}

/** 给 pre 加语言信息，并包一层 div.wisp-code（语言标签 + 复制按钮的定位容器） */
export function wispFrameTransformer(lineNumbers: boolean): ShikiTransformer {
  return {
    name: 'wisp:frame',
    pre(node) {
      const lang = this.options.lang || 'text';
      node.properties.dataLanguage = lang;
      this.addClassToHast(node, 'wisp-pre');
      if (lineNumbers) this.addClassToHast(node, 'wisp-ln');
      node.properties.tabindex = 0;
    },
    root(root) {
      const pre = root.children[0];
      if (!pre || pre.type !== 'element') return;
      const lang = String(pre.properties.dataLanguage ?? 'text');
      root.children = [
        {
          type: 'element',
          tagName: 'div',
          properties: { class: 'wisp-code', 'data-language': lang },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { class: 'wisp-lang', 'aria-hidden': 'true' },
              children: [{ type: 'text', value: lang === 'plaintext' ? 'text' : lang }],
            },
            pre,
          ],
        },
      ];
    },
  };
}

/**
 * 可直接放入 Astro `markdown.shikiConfig` 的对象。
 * Astro 7 的 unified 与 MDX 处理器共享 markdown.shikiConfig（rehype-shiki 读取它）。
 */
export function wispShikiConfig(config: WispConfig) {
  return {
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false as const,
    wrap: false as const,
    transformers: [wispDiffTransformer(), wispContrastTransformer(), wispFrameTransformer(config.features.lineNumbers)],
  };
}
