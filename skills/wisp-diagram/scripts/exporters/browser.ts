/**
 * Playwright 会话：懒启动 Chromium，多张图共用一个浏览器。
 * 页面挂在虚拟源 http://wisp.local/ 下，静态资源（字体、打包后的 JS）由路由表从本地磁盘提供，
 * 除非显式允许，其余网络请求一律拦截，保证导出离线、可复现。
 */
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { Browser, BrowserContext, Page } from 'playwright';
import { importPackage, INSTALL_HINT, log } from './env.ts';

export const ORIGIN = 'http://wisp.local';

const MIME: Record<string, string> = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png',
};

export interface PageOptions {
  /** 虚拟路径前缀 → 本地目录，例如 { '/fonts/inter/': '/abs/.../files/' } */
  mounts?: Record<string, string>;
  /** 虚拟路径 → 内存内容 */
  files?: Record<string, string | Buffer>;
  /** 页面 HTML（挂在 ORIGIN/ 根路径） */
  html?: string;
  colorScheme?: 'light' | 'dark';
  deviceScaleFactor?: number;
  viewport?: { width: number; height: number };
  /** 页面初始化脚本（在任何页面脚本之前执行） */
  initScript?: string;
}

export interface WispPage {
  page: Page;
  close(): Promise<void>;
}

export class BrowserSession {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (!this.launching) {
      this.launching = (async () => {
        let pw: typeof import('playwright');
        try {
          const m = await importPackage<typeof import('playwright') & { default?: typeof import('playwright') }>('playwright', ['@playwright/test']);
          pw = m.chromium ? m : m.default!;
        } catch {
          throw new Error(`[wisp-diagram] 需要 playwright。${INSTALL_HINT}`);
        }
        try {
          this.browser = await pw.chromium.launch();
        } catch (e) {
          throw new Error(`[wisp-diagram] 无法启动 Chromium：${(e as Error).message.split('\n')[0]}\n` +
            '请运行 `npx playwright install chromium`。');
        }
        return this.browser;
      })();
    }
    return this.launching;
  }

  async openPage(opts: PageOptions = {}): Promise<WispPage> {
    const browser = await this.getBrowser();
    const context: BrowserContext = await browser.newContext({
      colorScheme: opts.colorScheme ?? 'light',
      deviceScaleFactor: opts.deviceScaleFactor ?? 1,
      viewport: opts.viewport ?? { width: 1600, height: 1200 },
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && process.env.WISP_DIAGRAM_DEBUG) log(`console: ${m.text()}`); });
    if (opts.initScript) await page.addInitScript(opts.initScript);

    const mounts = Object.entries(opts.mounts ?? {}).sort((a, b) => b[0].length - a[0].length);
    const files = opts.files ?? {};
    const html = opts.html ?? '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) {
        if (process.env.WISP_DIAGRAM_DEBUG) log(`blocked ${url.href}`);
        return route.abort();
      }
      const p = decodeURIComponent(url.pathname);
      if (p === '/' || p === '/index.html') return route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' });
      if (p in files) {
        return route.fulfill({ body: files[p] as string | Buffer, contentType: MIME[extname(p)] ?? 'application/octet-stream' });
      }
      for (const [prefix, dir] of mounts) {
        if (p.startsWith(prefix)) {
          const rel = p.slice(prefix.length);
          if (rel.includes('..')) return route.fulfill({ status: 403 });
          try {
            const body = readFileSync(dir.replace(/\/?$/, '/') + rel);
            return route.fulfill({ body, contentType: MIME[extname(p)] ?? 'application/octet-stream' });
          } catch {
            return route.fulfill({ status: 404 });
          }
        }
      }
      return route.fulfill({ status: 404 });
    });
    await page.goto(`${ORIGIN}/`);
    Object.defineProperty(page, '__wispErrors', { value: errors });
    return { page, close: () => context.close() };
  }

  async close(): Promise<void> {
    if (this.launching) await this.launching.catch(() => null);
    await this.browser?.close();
    this.browser = null;
    this.launching = null;
  }
}

/** 取出页面运行期错误（用于报错信息）。 */
export function pageErrors(page: Page): string[] {
  return ((page as unknown as { __wispErrors?: string[] }).__wispErrors) ?? [];
}

/** 读取 UTF-8 文本的小工具。 */
export const readText = (p: string) => readFileSync(p, 'utf8');
