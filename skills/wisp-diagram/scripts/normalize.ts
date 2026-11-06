#!/usr/bin/env -S npx tsx
/**
 * 用法：tsx normalize.ts <文件或 glob>... [--check]
 * .drawio：解压全部页面并统一缩进；.excalidraw：排序元素、精简 appState。
 * --check 只检查不写入。退出码：0 无变化/已写入；1 --check 发现需要规范化；2 错误。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandArgs, kindOf } from './lib/cli-util.ts';
import { normalizeDrawio } from './lib/drawio.ts';
import { normalizeExcalidraw } from './lib/excalidraw.ts';

export function main(argv: string[], log: (s: string) => void = console.log): number {
  const check = argv.includes('--check');
  const files = expandArgs(argv.filter((a) => !a.startsWith('--')));
  if (!files.length) {
    log('usage: normalize.ts <file|glob>... [--check]');
    return 2;
  }
  let dirty = 0;
  let failed = false;
  for (const file of files) {
    const kind = kindOf(file);
    if (!kind) {
      log(`${file}: skipped (not .excalidraw or .drawio)`);
      continue;
    }
    try {
      const src = readFileSync(file, 'utf8');
      const next = kind === 'drawio' ? normalizeDrawio(src) : normalizeExcalidraw(src);
      if (next === src) continue;
      dirty++;
      if (check) log(`${file}: needs normalize`);
      else {
        writeFileSync(file, next);
        log(`${file}: normalized`);
      }
    } catch (e) {
      log(`${file}: failed: ${(e as Error).message}`);
      failed = true;
    }
  }
  if (failed) return 2;
  return check && dirty > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
