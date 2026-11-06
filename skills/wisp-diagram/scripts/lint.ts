#!/usr/bin/env -S npx tsx
/**
 * 用法：tsx lint.ts <文件或 glob>... [--fix] [--strict]
 * 退出码：0 无 error；1 有 error（--strict 时 warn 也算）；2 用法或读写错误。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandArgs, kindOf } from './lib/cli-util.ts';
import { applyFixes, lintDrawio, lintExcalidraw, type LintIssue } from './lib/lint.ts';

const lintOf = (kind: 'excalidraw' | 'drawio', src: string): LintIssue[] =>
  kind === 'excalidraw' ? lintExcalidraw(src) : lintDrawio(src);

export function main(argv: string[], log: (s: string) => void = console.log): number {
  const fix = argv.includes('--fix');
  const strict = argv.includes('--strict');
  const files = expandArgs(argv.filter((a) => !a.startsWith('--')));
  if (!files.length) {
    log('usage: lint.ts <file|glob>... [--fix] [--strict]');
    return 2;
  }
  let errors = 0;
  let warns = 0;
  let failed = false;
  for (const file of files) {
    const kind = kindOf(file);
    if (!kind) {
      log(`${file}: skipped (not .excalidraw or .drawio)`);
      continue;
    }
    try {
      let src = readFileSync(file, 'utf8');
      let issues = lintOf(kind, src);
      if (fix && issues.some((i) => i.fix)) {
        const next = applyFixes(kind, src, issues);
        writeFileSync(file, next);
        const applied = issues.filter((i) => i.fix).length;
        log(`${file}: applied ${applied} fix(es)`);
        src = next;
        issues = lintOf(kind, src);
      }
      for (const i of issues) {
        log(`${file}: ${i.level} [${i.rule}]${i.elementId ? ` #${i.elementId}` : ''} ${i.message}${i.fix ? ' (fixable)' : ''}`);
        if (i.level === 'error') errors++;
        else warns++;
      }
    } catch (e) {
      log(`${file}: failed: ${(e as Error).message}`);
      failed = true;
    }
  }
  log(`${files.length} file(s), ${errors} error(s), ${warns} warning(s)`);
  if (failed) return 2;
  return errors > 0 || (strict && warns > 0) ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
