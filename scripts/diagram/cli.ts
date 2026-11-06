/**
 * `pnpm diagram <command>` —— 站点侧的图表命令，包装 skills/wisp-diagram/scripts。
 *
 *   build [路径...] [--force] [--embed-fonts] [--fix] [--drawio cli|docker|browser]
 *         增量构建 src/content/**\/diagrams/*.{excalidraw,drawio} → .wisp.svg，并更新 manifest。
 *         给出路径时只处理这些文件/目录；扫描范围外的文件照常构建，但不写入 manifest。
 *   check                 只校验 manifest 哈希（CI 用，不需要浏览器 / draw.io）。失败退出码 1。
 *   lint [文件...] [--fix] [--strict]   转调 skill 的 lint.ts；默认检查扫描范围内全部源文件。
 *   export <文件> [--png] [--theme light|dark] [--scale 2] [-o out.png] [--transparent]
 *   new <skeleton.json> [-o out.excalidraw] [--build]   骨架 → .excalidraw（可选立即构建）
 *   probe                 打印 draw.io 导出方式探测结果
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  checkAll, contentHash, describeStatus, entryStatus, loadManifest, MANIFEST_PATH, REPO_ROOT, repoRel,
  saveManifest, scanSources, GENERATOR, type ManifestEntry,
} from './manifest.ts';

const SKILL_SCRIPTS = join(REPO_ROOT, 'skills', 'wisp-diagram', 'scripts');

const USAGE = `用法：pnpm diagram <build|check|lint|export|new|probe> [...]
  build [路径...] [--force] [--embed-fonts] [--fix] [--drawio cli|docker|browser]
  check
  lint [文件...] [--fix] [--strict]
  export <文件> [--png] [--theme light|dark] [--scale 2] [-o out.png]
  new <skeleton.json> [-o out.excalidraw] [--build]
  probe
`;

interface Flags { positional: string[]; flags: Map<string, string | true> }
const VALUE_FLAGS = new Set(['--drawio', '--theme', '--scale', '-o', '--out', '--seed']);

export function parseArgs(argv: string[]): Flags {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('-')) {
      if (VALUE_FLAGS.has(a)) flags.set(a, argv[++i] ?? '');
      else flags.set(a, true);
    } else positional.push(a);
  }
  return { positional, flags };
}

/** 把用户给的路径（文件或目录）展开为源文件绝对路径。 */
function expandTargets(paths: string[]): string[] {
  const out = new Set<string>();
  const scanned = scanSources().map((r) => join(REPO_ROOT, r));
  for (const p of paths) {
    const abs = resolve(p);
    if (!existsSync(abs)) throw new Error(`路径不存在：${p}`);
    if (statSync(abs).isDirectory()) {
      for (const s of scanned) if (s.startsWith(abs + '/') || s === abs) out.add(s);
    } else if (/\.(excalidraw|drawio)$/i.test(abs)) out.add(abs);
    else throw new Error(`不是图表源文件：${p}`);
  }
  return [...out].sort();
}

async function cmdBuild(f: Flags): Promise<number> {
  const force = f.flags.has('--force');
  const embedFonts = f.flags.has('--embed-fonts');
  const fix = f.flags.has('--fix');
  const drawio = f.flags.get('--drawio');
  const manifest = loadManifest();
  const scanned = new Set(scanSources());
  const targets = f.positional.length ? expandTargets(f.positional) : [...scanned].map((r) => join(REPO_ROOT, r));

  const todo: string[] = [];
  for (const abs of targets) {
    const rel = repoRel(abs);
    if (!scanned.has(rel) || force) { todo.push(abs); continue; }
    const st = entryStatus(rel, manifest);
    const optsChanged = manifest.entries[rel] && manifest.entries[rel].embedFonts !== embedFonts;
    if (st.kind !== 'ok' || optsChanged) todo.push(abs);
  }

  // 全量构建时清理孤儿记录
  let pruned = 0;
  if (!f.positional.length) {
    for (const rel of Object.keys(manifest.entries)) if (!scanned.has(rel)) { delete manifest.entries[rel]; pruned++; }
  }

  if (!todo.length) {
    if (pruned || !existsSync(MANIFEST_PATH)) saveManifest(manifest);
    process.stdout.write(`全部最新（${targets.length} 个源文件）${pruned ? `，清理 ${pruned} 条孤儿记录` : ''}\n`);
    return 0;
  }

  const { buildDiagram } = await import('../../skills/wisp-diagram/scripts/build.ts');
  const { BrowserSession } = await import('../../skills/wisp-diagram/scripts/exporters/browser.ts');
  const session = new BrowserSession();
  let failures = 0;
  let unknown = 0;
  try {
    for (const abs of todo) {
      const rel = repoRel(abs);
      try {
        const r = await buildDiagram(abs, {
          session, embedFonts, fix, drawio: typeof drawio === 'string' ? drawio as 'cli' | 'docker' | 'browser' : undefined,
        });
        for (const o of r.outputs) process.stdout.write(`✓ ${rel} → ${repoRel(o.path)}${o.page ? ` [${o.page.name}]` : ''}\n`);
        for (const w of r.warnings) process.stdout.write(`  warning: ${w}\n`);
        if (r.unknownColors.length) {
          unknown++;
          process.stdout.write(`  ✗ 非调色板颜色：${r.unknownColors.join(', ')}（运行 pnpm diagram lint --fix）\n`);
        }
        if (scanned.has(rel)) {
          const entry: ManifestEntry = {
            source: contentHash(readFileSync(abs)),
            style: r.style,
            exporter: r.exporter,
            embedFonts,
            outputs: Object.fromEntries(r.outputs.map((o) => [repoRel(o.path), contentHash(o.svg)])),
            ...(r.style === 'clean' ? { pages: r.outputs.map((o) => o.page?.name ?? '') } : {}),
          };
          manifest.entries[rel] = entry;
        } else {
          process.stdout.write(`  （${rel} 不在扫描范围内，未写入 manifest）\n`);
        }
      } catch (e) {
        failures++;
        process.stderr.write(`✗ ${rel}\n${(e as Error).message}\n`);
      }
    }
  } finally {
    await session.close();
    manifest.generator = GENERATOR;
    saveManifest(manifest);
  }
  process.stdout.write(`构建 ${todo.length - failures}/${todo.length}${pruned ? `，清理 ${pruned} 条孤儿记录` : ''}；manifest：${repoRel(MANIFEST_PATH)}\n`);
  return failures || unknown ? 1 : 0;
}

function cmdCheck(): number {
  const problems = checkAll();
  const n = scanSources().length;
  if (!problems.length) {
    process.stdout.write(`diagram check：${n} 个源文件，全部与 manifest 一致\n`);
    return 0;
  }
  process.stderr.write(`diagram check 失败（${problems.length} 项）：\n`);
  for (const p of problems) process.stderr.write(`  ✗ ${p.source}：${p.message}\n`);
  process.stderr.write('请在本地运行 `pnpm diagram build` 并提交生成的 .wisp.svg 与 scripts/diagram/manifest.json。\n');
  return 1;
}

/** 以子进程运行 skill 脚本（继承 tsx 的 loader 参数）。 */
function runSkillScript(script: string, args: string[]): number {
  const r = spawnSync(process.execPath, [...process.execArgv, join(SKILL_SCRIPTS, script), ...args], { stdio: 'inherit', cwd: process.cwd() });
  if (r.error) throw r.error;
  return r.status ?? 1;
}

function cmdLint(argv: string[]): number {
  const files = argv.filter((a) => !a.startsWith('-'));
  const flags = argv.filter((a) => a.startsWith('-'));
  const targets = files.length ? files : scanSources().map((r) => join(REPO_ROOT, r));
  if (!targets.length) {
    process.stdout.write('没有找到图表源文件（src/content/**/diagrams/*.{excalidraw,drawio}）\n');
    return 0;
  }
  return runSkillScript('lint.ts', [...targets, ...flags]);
}

async function cmdExport(f: Flags): Promise<number> {
  const file = f.positional[0];
  if (!file || f.positional.length > 1) { process.stderr.write(USAGE); return 2; }
  const theme = (f.flags.get('--theme') ?? 'light') as string;
  if (theme !== 'light' && theme !== 'dark') { process.stderr.write('--theme 只能是 light 或 dark\n'); return 2; }
  const scale = f.flags.has('--scale') ? Number(f.flags.get('--scale')) : 2;
  const out = (f.flags.get('-o') ?? f.flags.get('--out')) as string | undefined;
  const { exportPng } = await import('../../skills/wisp-diagram/scripts/export-png.ts');
  const res = await exportPng(file, out, {
    theme, scale, transparent: f.flags.has('--transparent'), embedFonts: !f.flags.has('--no-embed-fonts'),
  });
  for (const r of res) process.stdout.write(`${r.path} (${(r.bytes / 1024).toFixed(1)} KB)\n`);
  return 0;
}

async function cmdNew(f: Flags): Promise<number> {
  const input = f.positional[0];
  if (!input) { process.stderr.write(USAGE); return 2; }
  const { skeletonToExcalidraw, defaultSkeletonOutput } = await import('../../skills/wisp-diagram/scripts/skeleton-to-excalidraw.ts');
  const out = resolve(((f.flags.get('-o') ?? f.flags.get('--out')) as string | undefined) ?? defaultSkeletonOutput(resolve(input)));
  const { json, warnings } = await skeletonToExcalidraw(JSON.parse(readFileSync(resolve(input), 'utf8')));
  for (const w of warnings) process.stdout.write(`  warning: ${w}\n`);
  writeFileSync(out, json);
  process.stdout.write(`✓ ${repoRel(resolve(input))} → ${repoRel(out)}\n`);
  if (f.flags.has('--build')) return cmdBuild({ positional: [out], flags: new Map() });
  return 0;
}

async function cmdProbe(): Promise<number> {
  const { probeDrawio } = await import('../../skills/wisp-diagram/scripts/exporters/drawio.ts');
  for (const p of probeDrawio()) process.stdout.write(`${p.ok ? '✓' : '✗'} ${p.method}: ${p.detail}\n`);
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'build': return cmdBuild(parseArgs(rest));
    case 'check': return cmdCheck();
    case 'lint': return cmdLint(rest);
    case 'export': return cmdExport(parseArgs(rest));
    case 'new': return cmdNew(parseArgs(rest));
    case 'probe': return cmdProbe();
    case undefined: case '-h': case '--help': case 'help':
      process.stdout.write(USAGE);
      return cmd ? 0 : 2;
    default:
      process.stderr.write(`未知命令：${cmd}\n${USAGE}`);
      return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e: Error) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}
