import { expect, test } from '@playwright/test';

test('страница открывается, API и БД отвечают через прокси', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Family Wishlist');

  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok' });
});

test.describe('язык браузера', () => {
  test.use({ locale: 'ru-RU' });

  test('русский браузер видит русский интерфейс', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Семейные вишлисты с бронированием подарков')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });
});
