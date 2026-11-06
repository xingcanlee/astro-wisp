type Json = Record<string, unknown>;

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Json).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, sortKeys(x)]));
  }
  return v;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 规范化 .excalidraw：按 id 稳定排序元素、appState 只保留 viewBackgroundColor 和 gridSize、
 * 键排序、2 空格缩进 + 末尾换行。若所有元素都有分数索引 `index`（Excalidraw 的 z 序），
 * 则按 index 再按 id 排序以保留叠放顺序。幂等。
 */
export function normalizeExcalidraw(json: string | Json): string {
  const doc = (typeof json === 'string' ? JSON.parse(json) : structuredClone(json)) as Json;
  const els = Array.isArray(doc.elements) ? ([...doc.elements] as Json[]) : [];
  const hasIndex = els.length > 0 && els.every((e) => typeof e.index === 'string');
  els.sort((a, b) => (hasIndex ? cmp(a.index as string, b.index as string) : 0) || cmp(String(a.id ?? ''), String(b.id ?? '')));
  doc.elements = els;
  const app = (doc.appState ?? {}) as Json;
  const kept: Json = {};
  if ('viewBackgroundColor' in app) kept.viewBackgroundColor = app.viewBackgroundColor;
  if ('gridSize' in app) kept.gridSize = app.gridSize;
  doc.appState = kept;
  return JSON.stringify(sortKeys(doc), null, 2) + '\n';
}
