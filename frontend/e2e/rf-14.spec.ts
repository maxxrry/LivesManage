import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-14 (ERS 3.5): una clienta sin compras hace 61 días aparece como inactiva;
// el ranking ordena por total gastado.
// Datos simulados: en el live jueves (24/09/2026, Cerrado) Javiera pagó $12.000 y Valentina $4.000.

// Celular: tarjetas (lista). Computador: tabla (D-24).
const tabla = (page: Page, nombre: string) =>
  page.getByRole('list', { name: nombre }).or(page.getByRole('table', { name: nombre }));

test('el ranking ordena por total gastado', { tag: '@RF-14' }, async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-04T12:00:00-03:00'));
  await page.goto('/estadisticas');
  await page.getByRole('button', { name: 'Ranking' }).click();

  const ranking = tabla(page, 'Ranking de clientas');
  await expect(ranking.getByRole('link')).toHaveText([/Javiera Soto/, /Valentina Soto/]);
  await expect(ranking).toContainText('$12.000');
});

test('una clienta sin compras hace 61 días aparece como inactiva', { tag: '@RF-14' }, async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00')); // 61 días después del 24/09
  await page.goto('/estadisticas');
  await page.getByRole('button', { name: 'Inactivas' }).click();

  const inactivas = tabla(page, 'Clientas inactivas');
  await expect(inactivas).toContainText('Javiera Soto');
  await expect(inactivas).toContainText('61');
  await expect(inactivas.getByRole('link', { name: 'WhatsApp de Javiera Soto' })).toHaveAttribute(
    'href',
    'https://wa.me/56912345678',
  );

  // Con 61 días de criterio, ya no es inactiva.
  await page.getByLabel('Días sin comprar').fill('61');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status')).toHaveText('No hay clientas inactivas.');
});

// D-32: estadísticas de lives. El live jueves (Cerrado) vendió $25.000: $16.000 cobrado y $9.000 No pagó.
test('el gráfico muestra lo vendido por live, sin scroll horizontal', { tag: '@RF-14' }, async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-04T12:00:00-03:00'));
  await page.goto('/estadisticas');

  const grafico = page.getByRole('list', { name: 'Vendido por live' });
  await expect(grafico.getByRole('listitem')).toHaveCount(1);
  await expect(grafico).toContainText('$25.000');
  await expect(grafico).toContainText('Cobrado $16.000 · No pagó $9.000');

  // "Otro…" muestra las fechas; con un período sin lives, lo dice.
  await page.getByRole('button', { name: 'Otro…' }).click();
  await page.getByLabel('Desde').fill('2026-09-25');
  await expect(page.getByRole('status')).toHaveText('No hay lives cerrados entre el 25/09/2026 y el 04/10/2026.');

  const { documento, pantalla } = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    pantalla: window.innerWidth,
  }));
  expect(documento).toBeLessThanOrEqual(pantalla);
});
