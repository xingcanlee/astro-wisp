import { existsSync, globSync } from 'node:fs';

export type SourceKind = 'excalidraw' | 'drawio';

export function kindOf(file: string): SourceKind | null {
  if (file.endsWith('.excalidraw')) return 'excalidraw';
  if (file.endsWith('.drawio')) return 'drawio';
  return null;
}

/** 展开参数：存在的文件原样保留，否则按 glob 展开；返回排序去重后的列表。 */
export function expandArgs(args: string[]): string[] {
  const out = new Set<string>();
  for (const a of args) {
    if (existsSync(a)) out.add(a);
    else for (const f of globSync(a)) out.add(f);
  }
  return [...out].sort();
}
