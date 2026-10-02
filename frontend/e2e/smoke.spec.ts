import { expect, test } from '@playwright/test';

test('abre la app, navega por el menú y no hay scroll horizontal', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/lives$/);
  await expect(page.getByRole('heading', { name: 'Lives' })).toBeVisible();

  const botonMenu = page.getByRole('button', { name: 'Abrir menú' });
  const caja = await botonMenu.boundingBox();
  expect(caja?.width).toBeGreaterThanOrEqual(44);
  expect(caja?.height).toBeGreaterThanOrEqual(44);

  await botonMenu.tap();
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Clientas' }).tap();
  await expect(page).toHaveURL(/\/clientas$/);
  await expect(page.getByRole('heading', { name: 'Clientas' })).toBeVisible();

  const { documento, pantalla } = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    pantalla: window.innerWidth,
  }));
  expect(documento).toBeLessThanOrEqual(pantalla);
});
