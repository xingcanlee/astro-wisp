import { test, expect } from '@playwright/test';

const URL = '/posts/kitchen-sink/';

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
});

test('Mermaid：6 个 .wisp-pele，各含 SVG', async ({ page }) => {
  await expect(page.locator('.wisp-pele')).toHaveCount(6);
  await expect(page.locator('.wisp-pele svg')).toHaveCount(6);
});

test('KaTeX 公式存在', async ({ page }) => {
  expect(await page.locator('.katex').count()).toBeGreaterThan(0);
  await expect(page.locator('.katex-display').first()).toBeVisible();
});

test('代码块有行号（::before 计数器）', async ({ page }) => {
  const pre = page.locator('pre.wisp-ln').first();
  await expect(pre).toBeVisible();
  const content = await pre
    .locator('.line')
    .first()
    .evaluate((el) => getComputedStyle(el, '::before').content);
  expect(content).toMatch(/counter|\d/);
  expect(content).not.toBe('none');
});

test('复制按钮复制的文本不含行号', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const pre = page.locator('pre.wisp-ln').first();
  const btn = pre.locator('xpath=..').locator('.wisp-copy');
  await pre.hover();
  await btn.click();
  await expect(btn).toHaveAttribute('data-done', '');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const expected = await pre.locator('code').evaluate((c) => c.textContent ?? '');
  expect(copied.length).toBeGreaterThan(0);
  expect(copied).toBe(expected);
  // 每行都不应以行号开头
  for (const l of copied.split('\n')) expect(l).not.toMatch(/^\s*\d+\s*$/);
  await expect(btn.locator('xpath=following-sibling::span[@role="status"]')).toHaveText('已复制');
});

test('剪贴板不可用时给出复制失败反馈', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('blocked');
        },
      },
    });
    (document as Document & { execCommand?: () => boolean }).execCommand = () => false;
  });
  const pre = page.locator('pre.wisp-ln').first();
  const btn = pre.locator('xpath=..').locator('.wisp-copy');
  await btn.click();
  await expect(btn.locator('xpath=following-sibling::span[@role="status"]')).toHaveText('复制失败');
});

test('移动端交互入口有足够的触控高度', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  const heights = await page
    .locator(
      '.wisp-toc-inline summary, .wisp-series-inline summary, .wisp-fig-actions a, .wisp-copy, .wisp-theme-toggle',
    )
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(heights.length).toBeGreaterThan(0);
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
});

test('图表 figure 存在，下载链接返回 200', async ({ page, request }) => {
  const figs = page.locator('figure.wisp-diagram');
  expect(await figs.count()).toBeGreaterThanOrEqual(2);
  const links = page.locator('a.wisp-diagram-dl');
  const n = await links.count();
  expect(n).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < n; i++) {
    const href = await links.nth(i).getAttribute('href');
    expect((await request.get(href!)).status(), href!).toBe(200);
  }
});

test('所有 figure 题注在图下，图号单独排，动作与题注同一行', async ({ page }) => {
  // 带标题的 Markdown 图片 → figure + 题注，title 不再留在 img 上；不带标题的图片保持原样
  const img = page.locator('figure.wisp-image');
  await expect(img).toHaveCount(1);
  await expect(img.locator('img')).not.toHaveAttribute('title', /.*/);
  await expect(img.locator('figcaption .wisp-fig-no')).toHaveText('图 5：');
  await expect(page.locator('.prose p > img:only-child')).toHaveCount(1);
  // Mermaid 围栏 caption=
  await expect(page.locator('figure.wisp-pele figcaption .wisp-fig-no')).toHaveText('图 3：');
  // 图表：≥40rem 时动作在题注第一行右端；更窄时落到题注下一行、贴左缘
  const fig = page.locator('figure.wisp-diagram[aria-labelledby]').first();
  const [text, actions] = await Promise.all([
    fig.locator('.wisp-fig-text').boundingBox(),
    fig.locator('.wisp-fig-actions').boundingBox(),
  ]);
  if (page.viewportSize()!.width >= 640) {
    expect(actions!.x).toBeGreaterThan(text!.x + text!.width - 1);
    expect(Math.abs(actions!.y - text!.y)).toBeLessThan(6);
  } else {
    expect(actions!.y).toBeGreaterThanOrEqual(text!.y + text!.height - 1);
    expect(Math.abs(actions!.x - text!.x)).toBeLessThan(2);
  }
  await expect(page.locator('figure.wisp-diagram > .wisp-fig-actions')).toHaveCount(1);
});

test('图表和 Mermaid SVG 可用键盘打开 lightbox，并恢复焦点', async ({ page }) => {
  const triggers = page.locator('[data-wisp-lightbox-trigger]');
  expect(await triggers.count()).toBeGreaterThanOrEqual(8);

  const trigger = triggers.first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('dialog.wisp-lightbox');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('[data-lightbox-media] svg')).toHaveAttribute('role', 'img');
  await expect(dialog.locator('[data-lightbox-close]')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();

  await trigger.press('Space');
  await expect(dialog).toHaveAttribute('open', '');
  await dialog.locator('[data-lightbox-close]').click();
  await expect(dialog).not.toHaveAttribute('open', '');

  await trigger.click();
  await expect(dialog).toHaveAttribute('open', '');
  await dialog.click({ position: { x: 4, y: 4 } });
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('页面中所有 id 唯一', async ({ page }) => {
  const dup = await page.evaluate(() => {
    const seen = new Map<string, number>();
    document.querySelectorAll('[id]').forEach((e) => seen.set(e.id, (seen.get(e.id) ?? 0) + 1));
    return [...seen].filter(([, c]) => c > 1).map(([id, c]) => `${id} ×${c}`);
  });
  expect(dup).toEqual([]);
});

test('TOC 链接能跳转到对应标题', async ({ page }) => {
  const links = page.locator('nav.wisp-toc-aside a[data-toc-link]');
  const n = await links.count();
  expect(n).toBeGreaterThan(3);
  for (const i of [1, Math.floor(n / 2), n - 1]) {
    const link = links.nth(i);
    if (!(await link.isVisible())) continue;
    const href = (await link.getAttribute('href'))!;
    await link.click();
    await expect(page).toHaveURL(
      new RegExp(`${encodeURI(decodeURIComponent(href)).replace('#', '#')}$`),
    );
    const target = page.locator(`[id="${decodeURIComponent(href.slice(1))}"]`);
    await expect(target).toBeInViewport();
  }
});
