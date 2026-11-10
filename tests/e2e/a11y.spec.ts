import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/',
  '/posts/kitchen-sink/',
  '/posts/attention-explained/',
  '/posts/matrix-multiplication/',
  '/tags/',
  '/tags/' + encodeURI('线性代数') + '/',
  '/archive/',
];

for (const theme of ['light', 'dark'] as const) {
  for (const path of PAGES) {
    test(`axe ${theme} ${decodeURI(path)}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => localStorage.setItem('wisp-theme', t), theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.evaluate(() => document.fonts.ready);
      // 触发 client:visible 的岛屿并等待其渲染
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze();
      const bad = results.violations
        .map((v) => ({
          ...v,
          // axe 把 role=img/graphics-document 的 SVG 当成“从内容取名的控件”检查；
          // 这些图形的 aria-label/title 是整张图的名称，内部文字不是控件标签。
          nodes:
            v.id === 'label-content-name-mismatch'
              ? v.nodes.filter(
                  (n) =>
                    !n.html.trimStart().startsWith('<svg') &&
                    !n.target.some(
                      (s) =>
                        String(s).startsWith('svg[viewBox=') ||
                        s === '.wisp-d' ||
                        s === '.wisp-explainer__svg' ||
                        s === '.pele' ||
                        String(s).startsWith('.pele-'),
                    ),
                )
              : v.nodes,
        }))
        .filter((v) => (v.impact === 'serious' || v.impact === 'critical') && v.nodes.length > 0);
      const report = bad.map(
        (v) =>
          `${v.id} [${v.impact}] ${v.nodes.length} 处\n` +
          v.nodes
            .slice(0, 4)
            .map(
              (n) =>
                `   ${n.target.join(' ')} :: ${n.failureSummary?.split('\n').slice(0, 2).join(' | ')}`,
            )
            .join('\n'),
      );
      expect(report).toEqual([]);
    });
  }
}
