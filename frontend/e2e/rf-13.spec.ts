import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-13 (ERS 3.5): el total gastado de la ficha es igual a la suma
// de sus líneas Pagadas en lives cerrados.

const indicador = (page: Page, nombre: string) =>
  page.getByRole('region', { name: 'Indicadores' }).locator('div').filter({ hasText: nombre }).getByRole('definition');

// Celular: tarjetas (lista). Computador: tabla (D-24).
const historial = (page: Page) =>
  page.getByRole('list', { name: 'Historial por live' }).or(page.getByRole('table', { name: 'Historial por live' }));

test('el total gastado suma solo sus líneas Pagadas en lives cerrados', { tag: '@RF-13' }, async ({ page }) => {
  await page.goto('/clientas');
  await page.getByRole('link', { name: /Javiera Soto/ }).click();

  // Javiera: $12.000 pagados en el live jueves (Cerrado); los $13.000 del live martes (Abierto) no cuentan.
  await expect(indicador(page, 'Total gastado')).toHaveText('$12.000');
  await expect(indicador(page, 'Compras')).toHaveText('1');
  await expect(indicador(page, 'Última compra')).toHaveText('24/09/2026');

  await expect(historial(page)).toContainText('Live martes');
  await expect(historial(page)).toContainText('Despacho');
});

test('desde el historial se abre el live', { tag: '@RF-13' }, async ({ page }) => {
  await page.goto('/clientas/c-1');
  await expect(indicador(page, 'Lives sin pago')).toHaveText('1');

  await historial(page).getByRole('link', { name: '24/09/2026' }).click();
  await expect(page).toHaveURL(/\/lives\/s-1$/);
});
