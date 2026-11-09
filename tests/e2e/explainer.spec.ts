import { test, expect } from '@playwright/test';

const URL = '/posts/matrix-multiplication/';

test('MatMul hydrate，键盘 → 前进，caption 的 aria-live 文本变化', async ({ page }) => {
  await page.goto(URL);
  const player = page.locator('.wisp-player').first();
  await player.scrollIntoViewIfNeeded();
  await expect(player).toBeVisible();
  await expect(player.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
  const caption = player.locator('.wisp-player__caption');
  await expect(caption).toHaveAttribute('aria-live', 'polite');
  const before = await caption.textContent();
  await player.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => caption.textContent()).not.toBe(before);
  const count = player.locator('.wisp-player__count');
  await expect(count).toContainText(/^2 \//);
  await page.keyboard.press('ArrowLeft');
  await expect(count).toContainText(/^1 \//);
});

test.describe('reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('保留手动播放，仅关闭过渡动画', async ({ page }) => {
    await page.goto(URL);
    const player = page.locator('.wisp-player').first();
    await player.scrollIntoViewIfNeeded();
    await expect(player.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
    const play = player.locator('.wisp-player__play');
    const count = player.locator('.wisp-player__count');
    await player.getByRole('button', { name: '最后一步' }).click();
    await expect(play).toBeEnabled();
    await expect(play).toHaveAttribute('aria-label', '重新播放');
    await expect(play).toHaveAttribute('aria-description', /手动播放仍可用/);
    await expect(count).toHaveText('14 / 14');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', '暂停');
    await expect(count).toHaveText(/^2 \//);
  });
});
