import { expect, test } from '@playwright/test';

test('abre la app, navega por el menú y no hay scroll horizontal', { tag: '@smoke' }, async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/lives$/);
  await expect(page.getByRole('heading', { name: 'Lives' })).toBeVisible();

  const botonMenu = page.getByRole('button', { name: 'Abrir menú' });
  const menu = page.getByRole('navigation', { name: 'Menú principal' });
  if (isMobile) {
    // Celular: el menú se abre con ☰, que mide al menos 44×44 px.
    await expect(menu).toBeHidden();
    const caja = await botonMenu.boundingBox();
    expect(caja?.width).toBeGreaterThanOrEqual(44);
    expect(caja?.height).toBeGreaterThanOrEqual(44);
    await botonMenu.click();
  } else {
    // Computador: el menú está fijo y no hay ☰ (D-24).
    await expect(menu).toBeVisible();
    await expect(botonMenu).toBeHidden();
  }
  await menu.getByRole('link', { name: 'Clientas' }).click();
  await expect(page).toHaveURL(/\/clientas$/);
  await expect(page.getByRole('heading', { name: 'Clientas' })).toBeVisible();

  const { documento, pantalla } = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    pantalla: window.innerWidth,
  }));
  expect(documento).toBeLessThanOrEqual(pantalla);
});
