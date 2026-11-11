/**
 * 讲解里的行内公式：`<RichText text="令 $q = W^{Q}x$" />` 和 `<Tex tex="W^{UK}" />`。
 *
 * KaTeX（约 77KB gzip）按需加载，不进没有公式的讲解页面的客户端包：
 * - 服务端：模块初始化时静态等到 katex 加载完，岛屿的服务端 HTML 里就是排好的公式。
 * - 客户端：只有出现公式时才用动态 import() 加载 katex。水合时公式节点用 dangerouslySetInnerHTML +
 *   suppressHydrationWarning 保留服务端 HTML；chunk 到达之前若切换到新的一步，公式先显示源码。
 * 样式（katex.css，含字体）随本模块一起引入：正文没有公式、只有讲解说明里有公式时也能正确显示。
 */
import { useEffect, useSyncExternalStore } from 'react';
import type KatexNS from 'katex';
import { parseInlineMath } from '../core/math';
import '../../styles/katex.css';

type Katex = typeof KatexNS;

let katex: Katex | null = null;
let pending: Promise<Katex> | null = null;
const listeners = new Set<() => void>();

if (import.meta.env.SSR) katex = (await import('katex')).default;

/** 加载 KaTeX（幂等）。TexLabel / RichText 遇到公式时自动调用；也可以提前预热。 */
export function loadKatex(): Promise<Katex> {
  if (katex) return Promise.resolve(katex);
  pending ??= import('katex').then((m) => {
    katex = m.default;
    for (const l of listeners) l();
    return katex;
  });
  return pending;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => katex;
// 水合时客户端必须假定还没有 katex（服务端 HTML 由 suppressHydrationWarning 保留）
const getServerSnapshot = () => (import.meta.env.SSR ? katex : null);

function useKatex(needed: boolean): Katex | null {
  const k = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (needed && !k) void loadKatex();
  }, [needed, k]);
  return k;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const cache = new Map<string, string>();

/** 公式 → HTML。错误的公式不抛错，显示源码（错误色，title 里有原因）。 */
function renderTex(k: Katex | null, tex: string): string {
  if (!k) return escapeHtml(tex);
  let html = cache.get(tex);
  if (html === undefined) {
    html = k.renderToString(tex, {
      throwOnError: false,
      errorColor: 'var(--wisp-sem-error)',
      strict: 'ignore',
      output: 'htmlAndMathml',
    });
    cache.set(tex, html);
  }
  return html;
}

function TexSpan({ tex, k }: { tex: string; k: Katex | null }) {
  return (
    <span
      className="wisp-tex"
      dangerouslySetInnerHTML={{ __html: renderTex(k, tex) }}
      suppressHydrationWarning
    />
  );
}

export interface TexProps {
  /** TeX 源码，不带 `$` */
  tex: string;
}

/** 单个行内公式。 */
export function Tex({ tex }: TexProps) {
  const k = useKatex(true);
  return <TexSpan tex={tex} k={k} />;
}

export interface RichTextProps {
  /** 带 `$…$` 行内公式的文字；公式以外的文字原样转义输出，`\$` 是字面量美元符号 */
  text: string;
}

/** 文字 + 行内公式（片段，不加外层元素）。 */
export function RichText({ text }: RichTextProps) {
  const segments = parseInlineMath(text);
  const k = useKatex(segments.some((s) => s.type === 'math'));
  return (
    <>
      {segments.map((s, i) =>
        s.type === 'text' ? s.value : <TexSpan key={i} tex={s.value} k={k} />,
      )}
    </>
  );
}
