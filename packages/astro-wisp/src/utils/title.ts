/**
 * 文章标题按词断行：中文标题在构建期通过 Intl.Segmenter 插入 <wbr>，
 * 配合 word-break: keep-all 让 text-wrap: balance 只在词边界换行，
 * 同时遵守中文避头尾禁则（不在闭合括号、冒号、顿号等标点前插入 <wbr>）。
 */
export function escapeHtml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const NO_BREAK_AFTER = /[\s\p{Ps}\p{Pi}—\-/]$/u;
const NO_BREAK_BEFORE = /^[\s\p{Pe}\p{Pf}：:；;，,。.！!？?、…—·\-/]/u;

export function segmentTitleWords(
  titleText: string,
  lang: string | undefined,
): { html: string; segmented: boolean } {
  const zh = /^zh\b/i.test(lang ?? '');
  if (!zh || typeof Intl.Segmenter !== 'function') {
    return { html: escapeHtml(titleText), segmented: false };
  }
  const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
  const parts = [...segmenter.segment(titleText)].map((x) => x.segment).filter(Boolean);
  if (parts.length === 0) {
    return { html: '', segmented: true };
  }
  let html = escapeHtml(parts[0]!);
  for (let i = 1; i < parts.length; i += 1) {
    const prev = parts[i - 1]!;
    const next = parts[i]!;
    if (!NO_BREAK_AFTER.test(prev) && !NO_BREAK_BEFORE.test(next)) {
      html += '<wbr>';
    }
    html += escapeHtml(next);
  }
  return { html, segmented: true };
}
