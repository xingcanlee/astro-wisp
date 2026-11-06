import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Refresh the theme-owned part of template/ without touching its starter content
 * or site configuration. Run this after changing the runtime theme source.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = join(root, 'template');

function copy(relativePath: string, filter?: (path: string) => boolean): void {
  const from = join(root, relativePath);
  const to = join(template, relativePath);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, {
    recursive: true,
    filter: (source) => filter?.(relative(root, source)) ?? true,
  });
}

const withoutTests = (path: string) => {
  const name = path.split(/[/\\]/).pop() ?? '';
  return !name.includes('.test.') && !name.endsWith('.fixture.ts') && name !== '__snapshots__' && name !== 'tests';
};

for (const path of ['astro.config.ts', 'tsconfig.json', '.gitignore', 'public', 'design', 'src/layouts', 'src/pages', 'src/explainers', 'src/wisp']) {
  copy(path, withoutTests);
}

// scripts/ is fully theme-owned; clear it first so removed tooling cannot linger.
rmSync(join(template, 'scripts'), { recursive: true, force: true });
for (const path of ['scripts/gen-tokens.ts', 'scripts/check-contrast.ts', 'scripts/lib/palette.ts', 'scripts/diagram/cli.ts', 'scripts/diagram/manifest.ts']) {
  copy(path);
}

copy('skills/wisp-diagram', (path) => withoutTests(path) && !path.endsWith('.pyc'));

const manifest = join(template, 'scripts/diagram/manifest.json');
mkdirSync(dirname(manifest), { recursive: true });
writeFileSync(manifest, '{"version":1,"generator":"wisp-diagram@1","entries":{}}\n');

const managed = ['astro.config.ts', 'tsconfig.json', '.gitignore', 'public', 'design', 'src/layouts', 'src/pages', 'src/explainers', 'src/wisp', 'scripts', 'skills/wisp-diagram'];
console.log(`template 已同步：${managed.length} 组主题文件（保留站点配置和示例内容）`);
