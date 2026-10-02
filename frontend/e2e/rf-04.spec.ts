import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-04 (ERS 3.5): con un live Abierto no se puede abrir otro;
// la lista muestra los totales de cada live.

const tarjeta = (page: Page, nombre: string) =>
  page.getByRole('list', { name: 'Lista de lives' }).getByRole('link').filter({ hasText: nombre });

test.beforeEach(async ({ page }) => {
  await page.goto('/lives');
});

test('la lista muestra los totales de cada live', { tag: '@RF-04' }, async ({ page }) => {
  await expect(tarjeta(page, 'Live martes')).toContainText('Abierta');
  await expect(tarjeta(page, 'Live martes')).toContainText('5 clientas');
  await expect(tarjeta(page, 'Live martes')).toContainText('Total $58.000');
  await expect(tarjeta(page, 'Live martes')).toContainText('Pagado $13.000');

  await expect(tarjeta(page, 'Live jueves noche')).toContainText('Cerrada');
  await expect(tarjeta(page, 'Live jueves noche')).toContainText('Total $25.000');
  await expect(tarjeta(page, 'Live jueves noche')).toContainText('Pagado $16.000');
});

test('con un live Abierto no se puede abrir otro y se ofrece continuar', { tag: '@RF-04' }, async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Continuar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir live' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Continuar' }).tap();

  await expect(page).toHaveURL(/\/lives\/s-2$/);
  await expect(page.getByRole('combobox', { name: 'Anotación' })).toBeVisible();
});

test('tocar un live abre su pantalla', { tag: '@RF-04' }, async ({ page }) => {
  await tarjeta(page, 'Live jueves noche').tap();

  await expect(page).toHaveURL(/\/lives\/s-1$/);
  await expect(page.getByText('ya no se puede anotar')).toBeVisible();
});
