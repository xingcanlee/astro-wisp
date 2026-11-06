/**
 * draw.io 导出，按顺序探测三种方式（diagrams.md §6.3）：
 *   1. cli     —— draw.io desktop：`drawio -x -f svg`（Linux 无显示时自动套 xvfb-run，并加 --no-sandbox）
 *   2. docker  —— 本地**已存在**的镜像 rlespinasse/drawio-export（不会自动 pull）
 *   3. browser —— Playwright 加载 draw.io 官方 viewer-static.min.js，离线调用 Graph#getSvg
 *      viewer 脚本来源：$WISP_DRAWIO_VIEWER → 缓存 → 首次自动下载（$WISP_DIAGRAM_OFFLINE=1 时禁止下载）
 * 可用 $WISP_DRAWIO_EXPORTER=cli|docker|browser 或 --drawio <method> 强制指定。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { type BrowserSession, ORIGIN, pageErrors } from './browser.ts';
import { cacheDir, log, requirePackageDir, resolvePackageDir, INSTALL_HINT } from './env.ts';
import { fontFaceCss, type FontShard } from './fonts.ts';
import { basename } from 'node:path';

export type DrawioMethod = 'cli' | 'docker' | 'browser';
export const DRAWIO_METHODS: DrawioMethod[] = ['cli', 'docker', 'browser'];
export const DOCKER_IMAGE = 'rlespinasse/drawio-export';
export const VIEWER_URL = 'https://viewer.diagrams.net/js/viewer-static.min.js';

export interface DrawioPageInfo { index: number; name: string }
export interface DrawioPageSvg extends DrawioPageInfo { svg: string }

export interface Probe { method: DrawioMethod; ok: boolean; detail: string }

function which(cmd: string): string | null {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    const p = join(dir, cmd);
    try { if (statSync(p).isFile()) return p; } catch { /* 无 */ }
  }
  return null;
}

export function findDrawioBinary(): string | null {
  if (process.env.WISP_DRAWIO_BIN) return existsSync(process.env.WISP_DRAWIO_BIN) ? process.env.WISP_DRAWIO_BIN : null;
  for (const c of ['drawio', 'draw.io']) {
    const p = which(c);
    if (p) return p;
  }
  for (const p of ['/Applications/draw.io.app/Contents/MacOS/draw.io', '/opt/drawio/drawio', 'C:\\Program Files\\draw.io\\draw.io.exe']) {
    if (existsSync(p)) return p;
  }
  return null;
}

function dockerImagePresent(): { ok: boolean; detail: string } {
  if (!which('docker')) return { ok: false, detail: '未安装 docker' };
  const r = spawnSync('docker', ['image', 'inspect', DOCKER_IMAGE], { encoding: 'utf8', timeout: 15000 });
  if (r.status === 0) return { ok: true, detail: `镜像 ${DOCKER_IMAGE} 已存在` };
  const err = (r.stderr || '').toLowerCase();
  if (err.includes('permission denied')) return { ok: false, detail: '没有 docker 权限' };
  if (err.includes('cannot connect')) return { ok: false, detail: 'docker 守护进程未运行' };
  return { ok: false, detail: `本地没有镜像 ${DOCKER_IMAGE}（不会自动 pull，可手动 \`docker pull ${DOCKER_IMAGE}\`）` };
}

export function viewerCachePath(): string { return join(cacheDir(), 'drawio-viewer-static.min.js'); }

function viewerAvailability(): { ok: boolean; detail: string; path?: string } {
  const env = process.env.WISP_DRAWIO_VIEWER;
  if (env) return existsSync(env) ? { ok: true, detail: `viewer：${env}`, path: env } : { ok: false, detail: `WISP_DRAWIO_VIEWER 指向的文件不存在：${env}` };
  const cached = viewerCachePath();
  if (existsSync(cached)) return { ok: true, detail: `viewer 缓存：${cached}`, path: cached };
  if (process.env.WISP_DIAGRAM_OFFLINE) return { ok: false, detail: `没有 viewer 缓存且处于离线模式（WISP_DIAGRAM_OFFLINE）` };
  return { ok: true, detail: `首次使用时从 ${VIEWER_URL} 下载到 ${cached}` };
}

export function probeDrawio(): Probe[] {
  const bin = findDrawioBinary();
  const probes: Probe[] = [{ method: 'cli', ok: !!bin, detail: bin ? `draw.io CLI：${bin}` : 'PATH 中没有 drawio / draw.io' }];
  const d = dockerImagePresent();
  probes.push({ method: 'docker', ...d });
  const pw = resolvePackageDir('playwright', ['@playwright/test']);
  const v = viewerAvailability();
  probes.push({ method: 'browser', ok: !!pw && v.ok, detail: pw ? v.detail : '未安装 playwright' });
  return probes;
}

export function drawioUnavailableMessage(probes: Probe[]): string {
  return [
    '[wisp-diagram] 没有可用的 draw.io 导出方式：',
    ...probes.map((p) => `  - ${p.method}: ${p.detail}`),
    '任选其一：',
    '  1. 安装 draw.io desktop（https://github.com/jgraph/drawio-desktop/releases），确保 `drawio` 在 PATH 中；Linux 无头环境还需 xvfb（apt install xvfb）。',
    `  2. docker pull ${DOCKER_IMAGE}`,
    `  3. 安装 playwright 与 Chromium（npx playwright install chromium），并允许联网下载一次 viewer，或手动下载 ${VIEWER_URL} 后设置 WISP_DRAWIO_VIEWER=<路径>。`,
  ].join('\n');
}

export function chooseDrawioMethod(prefer?: DrawioMethod): DrawioMethod {
  const want = prefer ?? (process.env.WISP_DRAWIO_EXPORTER as DrawioMethod | undefined);
  const probes = probeDrawio();
  if (want) {
    const p = probes.find((x) => x.method === want);
    if (!p) throw new Error(`[wisp-diagram] 未知的 draw.io 导出方式：${want}（可选 ${DRAWIO_METHODS.join('/')}）`);
    if (!p.ok) throw new Error(`[wisp-diagram] 指定的 draw.io 导出方式 ${want} 不可用：${p.detail}\n${drawioUnavailableMessage(probes)}`);
    return want;
  }
  const hit = probes.find((p) => p.ok);
  if (!hit) throw new Error(drawioUnavailableMessage(probes));
  return hit.method;
}

// ---------------------------------------------------------------- 页面信息

const DIAGRAM_RE = /<diagram\b([^>]*)>/g;
export function drawioPages(xml: string): DrawioPageInfo[] {
  const out: DrawioPageInfo[] = [];
  let i = 0;
  for (const m of xml.matchAll(DIAGRAM_RE)) {
    const name = /\sname="([^"]*)"/.exec(m[1]!)?.[1];
    out.push({ index: i, name: name ? decodeXml(name) : `Page-${i + 1}` });
    i++;
  }
  return out;
}

const decodeXml = (s: string) => s.replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-f]+);/gi, (_m, e: string) =>
  e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'quot' ? '"' : e === 'apos' ? "'" : e === 'amp' ? '&'
    : String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));

/** 某一页所有 cell 的文字（去 HTML），用于 <desc> 默认值。 */
export function drawioPageLabels(xml: string, index: number): string[] {
  const bodies = [...xml.matchAll(/<diagram\b[^>]*>([\s\S]*?)<\/diagram>/g)].map((m) => m[1]!);
  const body = bodies[index] ?? '';
  const labels: string[] = [];
  for (const m of body.matchAll(/<(?:mxCell|UserObject|object)\b[^>]*?\s(?:value|label)="([^"]*)"/g)) {
    const t = decodeXml(m[1]!).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    const clean = decodeXml(t).replace(/\s+/g, ' ').trim();
    if (clean) labels.push(clean);
  }
  return labels;
}

// ---------------------------------------------------------------- 输出清洗

/** 把 light-dark(A, B) 替换为 A（支持 A 内含括号）。 */
export function stripLightDark(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const j = s.indexOf('light-dark(', i);
    if (j < 0) { out += s.slice(i); break; }
    out += s.slice(i, j);
    let k = j + 'light-dark('.length;
    let depth = 0;
    let first = '';
    let end = -1;
    let firstDone = false;
    for (; k < s.length; k++) {
      const c = s[k]!;
      if (c === '(') depth++;
      else if (c === ')') { if (depth === 0) { end = k; break; } depth--; }
      else if (c === ',' && depth === 0 && !firstDone) { firstDone = true; continue; }
      if (!firstDone) first += c;
    }
    if (end < 0) { out += s.slice(j); break; }
    out += first.trim();
    i = end + 1;
  }
  return out;
}

/**
 * draw.io（新版本）导出的 SVG 带有自适应暗色：`light-dark()`、`--ge-adaptive-*` 变量、随机根 id。
 * Wisp 用自己的 --wd-* 机制做暗色，这里统一还原成浅色字面量，交给 toPortableSvg 映射。
 */
export function cleanDrawioSvg(svg: string): string {
  let s = svg.replace(/<\?xml[^>]*>\s*/g, '').replace(/<!DOCTYPE[^>]*>\s*/gi, '');
  s = s.replace(/<style\b[^>]*>[^<]*--ge-adaptive[^<]*<\/style>/g, '');
  s = stripLightDark(s);
  s = s.replace(/var\(--ge-[\w-]+,\s*([^()]+?|[a-z]+\([^)]*\))\)/g, '$1');
  // 根元素：去掉随机 id、内嵌源数据
  s = s.replace(/<svg\b([^>]*)>/, (_m, a: string) => `<svg${a.replace(/\sid="ge-svg-[^"]*"/, '').replace(/\scontent="[^"]*"/, '')}>`);
  // fill/stroke 属性已存在时，style 中重复的同名声明删除（避免覆盖 var()）
  s = s.replace(/<([a-zA-Z]+)\b([^>]*?)\sstyle="([^"]*)"/g, (m, tag: string, attrs: string, style: string) => {
    const has = (p: string) => new RegExp(`\\s${p}="`).test(attrs);
    const kept = style.split(';').filter((d) => {
      const prop = d.split(':')[0]?.trim().toLowerCase();
      if (!prop) return false;
      return !((prop === 'fill' || prop === 'stroke') && has(prop));
    });
    return kept.length ? `<${tag}${attrs} style="${kept.join(';').trim()}"` : `<${tag}${attrs}`;
  });
  return s;
}

// ---------------------------------------------------------------- 三种实现

function exportViaCli(xml: string, pages: DrawioPageInfo[], border: number): DrawioPageSvg[] {
  const bin = findDrawioBinary()!;
  const dir = mkdtempSync(join(tmpdir(), 'wisp-drawio-'));
  try {
    const src = join(dir, 'in.drawio');
    writeFileSync(src, xml);
    return pages.map((p) => {
      const out = join(dir, `p${p.index}.svg`);
      let cmd = bin;
      let args = ['-x', '-f', 'svg', '--embed-svg-fonts', 'false', '-b', String(border), '-p', String(p.index + 1), '-o', out, src];
      if (process.platform === 'linux') {
        args.push('--no-sandbox');
        if (!process.env.DISPLAY && which('xvfb-run')) { args = ['-a', cmd, ...args]; cmd = 'xvfb-run'; }
      }
      const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 120000 });
      if (r.status !== 0 || !existsSync(out)) throw new Error(`[wisp-diagram] drawio CLI 导出失败（page ${p.name}）：${r.stderr || r.error?.message}`);
      return { ...p, svg: readFileSync(out, 'utf8') };
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function exportViaDocker(xml: string, pages: DrawioPageInfo[], border: number): DrawioPageSvg[] {
  const dir = mkdtempSync(join(tmpdir(), 'wisp-drawio-'));
  try {
    writeFileSync(join(dir, 'in.drawio'), xml);
    const r = spawnSync('docker', ['run', '--rm', '-v', `${dir}:/data`, DOCKER_IMAGE,
      '--format', 'svg', '--embed-svg-fonts', 'false', '--border', String(border), '--output', 'out', 'in.drawio'],
    { encoding: 'utf8', timeout: 300000 });
    if (r.status !== 0) throw new Error(`[wisp-diagram] docker drawio-export 失败：${r.stderr || r.stdout}`);
    const outDir = join(dir, 'out');
    const files = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.svg')) : [];
    return pages.map((p) => {
      const f = files.find((x) => x === `in-${p.name}.svg`) ?? (pages.length === 1 ? files[0] : undefined);
      if (!f) throw new Error(`[wisp-diagram] docker 导出结果中找不到页面 ${p.name}（得到 ${files.join(', ')}）`);
      return { ...p, svg: readFileSync(join(outDir, f), 'utf8') };
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function ensureViewer(): Promise<string> {
  const v = viewerAvailability();
  if (!v.ok) throw new Error(`[wisp-diagram] ${v.detail}`);
  if (v.path) return v.path;
  const dest = viewerCachePath();
  log(`下载 draw.io viewer：${VIEWER_URL} → ${dest}`);
  const res = await fetch(VIEWER_URL);
  if (!res.ok) throw new Error(`[wisp-diagram] 下载 draw.io viewer 失败：HTTP ${res.status}`);
  const body = await res.text();
  if (!body.includes('GraphViewer')) throw new Error('[wisp-diagram] 下载的 viewer 内容异常');
  writeFileSync(dest, body);
  return dest;
}

async function exportViaBrowser(session: BrowserSession, xml: string, pages: DrawioPageInfo[], border: number): Promise<DrawioPageSvg[]> {
  const viewer = await ensureViewer();
  const inter = join(requirePackageDir('@fontsource-variable/inter', INSTALL_HINT), 'files');
  const noto = join(requirePackageDir('@fontsource-variable/noto-sans-sc', INSTALL_HINT), 'files');
  const urlFor = (s: FontShard) => `${ORIGIN}/fonts/${s.family === 'Inter' ? 'inter' : 'noto-sc'}/${basename(s.file)}`;
  const css = fontFaceCss(['Inter', 'Noto Sans SC'], urlFor);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style>` +
    '<script>window.mxLoadResources=false;window.mxLoadStylesheets=false;window.DRAWIO_LIGHTBOX=false;</script>' +
    '</head><body><div id="c" style="position:absolute;left:0;top:0;width:4000px;height:4000px"></div></body></html>';
  const { page, close } = await session.openPage({
    html,
    mounts: { '/fonts/inter/': inter, '/fonts/noto-sc/': noto },
    files: { '/viewer.js': readFileSync(viewer) },
  });
  try {
    await page.addScriptTag({ url: `${ORIGIN}/viewer.js` });
    const out: DrawioPageSvg[] = [];
    for (const p of pages) {
      const svg = await page.evaluate(({ xml, index, border }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = window as any;
        const doc = g.mxUtils.parseXml(xml);
        const diagram = doc.documentElement.getElementsByTagName('diagram')[index];
        const inner = diagram.getElementsByTagName('mxGraphModel')[0];
        // 每页单独成文档：mxCodec 按整份文档建 id 索引，多页共用文档会出现 Duplicate ID
        const model = inner
          ? g.mxUtils.parseXml(g.mxUtils.getXml(inner)).documentElement
          : g.mxUtils.parseXml(g.Graph.decompress(diagram.textContent)).documentElement; // 压缩页
        const container = document.getElementById('c')!;
        container.innerHTML = '';
        const graph = new g.Graph(container);
        if (graph.setAdaptiveColors) graph.setAdaptiveColors('none');
        new g.mxCodec(model.ownerDocument).decode(model, graph.getModel());
        const svgEl = graph.getSvg(null, 1, border, false, null, true, null, null, null, false, false, 'light');
        const s = new XMLSerializer().serializeToString(svgEl);
        graph.destroy();
        return s;
      }, { xml, index: p.index, border });
      out.push({ ...p, svg });
    }
    if (pageErrors(page).length) log(`viewer 警告：${pageErrors(page).join('; ')}`);
    return out;
  } finally {
    await close();
  }
}

export interface DrawioExportOptions {
  method?: DrawioMethod;
  border?: number;
  /** 只导出这些页（index）；默认全部 */
  pages?: number[];
}

export async function exportDrawioSvgs(session: BrowserSession, xml: string, opts: DrawioExportOptions = {}): Promise<{ method: DrawioMethod; pages: DrawioPageSvg[] }> {
  const method = chooseDrawioMethod(opts.method);
  const border = opts.border ?? 8;
  let pages = drawioPages(xml);
  if (!pages.length) throw new Error('[wisp-diagram] .drawio 中没有 <diagram> 页面');
  if (opts.pages) pages = pages.filter((p) => opts.pages!.includes(p.index));
  const raw = method === 'cli' ? exportViaCli(xml, pages, border)
    : method === 'docker' ? exportViaDocker(xml, pages, border)
    : await exportViaBrowser(session, xml, pages, border);
  return { method, pages: raw.map((p) => ({ ...p, svg: cleanDrawioSvg(p.svg) })) };
}
