import { test, expect } from '@playwright/test';

const URL = '/posts/matrix-multiplication/';

test('MatMul hydrate，键盘 → 前进，caption 的 aria-live 文本变化', async ({ page }) => {
  await page.goto(URL);
  const figure = page.locator('.wisp-explainer').first();
  const player = figure.locator('.wisp-player');
  await player.scrollIntoViewIfNeeded();
  await expect(player).toBeVisible();
  await expect(player.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
  const caption = player.locator('.wisp-player__caption');
  await expect(caption).toHaveAttribute('aria-live', 'polite');
  const before = await caption.textContent();
  await player.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => caption.textContent()).not.toBe(before);
  // 有标题时步数在标题行（figcaption），没有标题时在控制条右侧
  const count = figure.locator('.wisp-player__count');
  await expect(count).toHaveText(/^2 \//);
  await page.keyboard.press('ArrowLeft');
  await expect(count).toHaveText(/^1 \//);
});

test('翻页时卡片高度不变（说明区按最长一步预留高度）', async ({ page }) => {
  await page.goto(URL);
  const figure = page.locator('.wisp-explainer').first();
  const player = figure.locator('.wisp-player');
  await player.scrollIntoViewIfNeeded();
  await expect(player.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
  const total = Number(await player.locator('.wisp-player__range').getAttribute('max')) + 1;
  await player.focus();
  const heights = new Set<number>();
  for (let i = 0; i < total; i++) {
    heights.add(Math.round(((await figure.boundingBox())?.height ?? 0) * 10));
    await page.keyboard.press('ArrowRight');
  }
  expect([...heights]).toHaveLength(1);
});

test('倍速按钮在 0.5× → 1× → 2× 之间循环', async ({ page }) => {
  await page.goto(URL);
  const player = page.locator('.wisp-player').first();
  await player.scrollIntoViewIfNeeded();
  await expect(player.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
  const speed = player.locator('.wisp-player__speed');
  await expect(speed).toHaveText('1×');
  await speed.click();
  await expect(speed).toHaveText('2×');
  await speed.click();
  await expect(speed).toHaveText('0.5×');
  await expect(speed).toHaveAttribute('aria-label', /0\.5/);
});

test.describe('reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('保留手动播放，仅关闭过渡动画', async ({ page }) => {
    await page.goto(URL);
    const figure = page.locator('.wisp-explainer').first();
    const player = figure.locator('.wisp-player');
    await player.scrollIntoViewIfNeeded();
    await expect(player.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
    const play = player.locator('.wisp-player__play');
    const count = figure.locator('.wisp-player__count');
    await player.focus();
    await page.keyboard.press('End');
    await expect(play).toBeEnabled();
    await expect(play).toHaveAttribute('aria-label', '重新播放');
    await expect(play).toHaveAttribute('aria-description', /手动播放仍可用/);
    await expect(count).toHaveText('14 / 14');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', '暂停');
    await expect(count).toHaveText(/^2 \//);
  });
});
