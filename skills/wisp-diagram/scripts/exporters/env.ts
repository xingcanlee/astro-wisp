/**
 * 导出器公共环境：缓存目录、包解析、哈希、日志。
 * 只依赖 node 内置模块；包解析从 skill 自身目录和 cwd 两处出发，
 * 因此 skill 目录被单独复制到别处（自带 node_modules 或宿主项目已安装依赖）都能工作。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** skill 的 scripts/ 目录（本文件位于 scripts/exporters/）。 */
export const SCRIPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** skill 根目录（含 palette.json）。 */
export const SKILL_DIR = resolve(SCRIPTS_DIR, '..');

/** 生成器标识，写入 manifest；导出逻辑有不兼容变化时递增。 */
export const GENERATOR = 'wisp-diagram@1';

export function cacheDir(): string {
  const base = process.env.WISP_DIAGRAM_CACHE
    ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'wisp-diagram');
  mkdirSync(base, { recursive: true });
  return base;
}

export const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');

const requirers = () => [
  createRequire(join(SCRIPTS_DIR, 'package.json')),
  createRequire(join(process.cwd(), 'package.json')),
];

/**
 * 解析一个包的根目录（含 package.json）。
 * `via` 为可选的“中转包”：esbuild 在 pnpm 项目里通常只是 vite/astro 的传递依赖。
 */
export function resolvePackageDir(name: string, via: string[] = []): string | null {
  for (const req of requirers()) {
    const candidates: Array<NodeJS.Require> = [req];
    for (const v of via) {
      try { candidates.push(createRequire(req.resolve(`${v}/package.json`))); } catch { /* 不存在 */ }
    }
    for (const r of candidates) {
      try { return dirname(r.resolve(`${name}/package.json`)); } catch { /* 继续 */ }
      // 部分包的 exports 不暴露 package.json：解析入口后向上找
      try {
        let d = dirname(r.resolve(name));
        while (d !== dirname(d)) {
          const pj = join(d, 'package.json');
          if (existsSync(pj) && JSON.parse(readFileSync(pj, 'utf8')).name === name) return d;
          d = dirname(d);
        }
      } catch { /* 继续 */ }
    }
  }
  return null;
}

export function requirePackageDir(name: string, hint: string, via: string[] = []): string {
  const d = resolvePackageDir(name, via);
  if (!d) throw new Error(`[wisp-diagram] 找不到依赖 ${name}。${hint}`);
  return d;
}

/** 以 ESM 动态导入一个包（按 resolvePackageDir 的规则解析）。 */
export async function importPackage<T = unknown>(name: string, via: string[] = []): Promise<T> {
  for (const req of requirers()) {
    const rs: NodeJS.Require[] = [req];
    for (const v of via) {
      try { rs.push(createRequire(req.resolve(`${v}/package.json`))); } catch { /* 无 */ }
    }
    for (const r of rs) {
      let p: string;
      try { p = r.resolve(name); } catch { continue; }
      return (await import(pathToFileURL(p).href)) as T;
    }
  }
  throw new Error(`[wisp-diagram] 找不到依赖 ${name}。请在 skill 的 scripts/ 目录运行 \`npm install\`。`);
}

export const INSTALL_HINT = '请在 skills/wisp-diagram/scripts/ 目录运行 `npm install`（或在宿主项目安装同名依赖）。';

export function log(msg: string): void {
  if (process.env.WISP_DIAGRAM_QUIET) return;
  process.stderr.write(`[wisp-diagram] ${msg}\n`);
}

export function readPackageVersion(dir: string): string {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version as string;
}
