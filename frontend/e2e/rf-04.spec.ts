import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-04 (ERS 3.5): con un live Abierto no se puede abrir otro;
// la lista muestra los totales de cada live.

// Celular: tarjetas (lista). Computador: tabla (D-24). getByRole ignora la versión oculta.
const lista = (page: Page) =>
  page.getByRole('list', { name: 'Lista de lives' }).or(page.getByRole('table', { name: 'Lista de lives' }));
const live = (page: Page, nombre: string) => lista(page).locator('li, tbody tr').filter({ hasText: nombre });

test.beforeEach(async ({ page }) => {
  await page.goto('/lives');
});

test('la lista muestra los totales de cada live', { tag: '@RF-04' }, async ({ page }) => {
  await expect(live(page, 'Live martes')).toContainText('Abierta');
  await expect(live(page, 'Live martes')).toContainText('$58.000');
  await expect(live(page, 'Live martes')).toContainText('$13.000');

  await expect(live(page, 'Live jueves noche')).toContainText('Cerrada');
  await expect(live(page, 'Live jueves noche')).toContainText('$25.000');
  await expect(live(page, 'Live jueves noche')).toContainText('$16.000');
});

test('con un live Abierto no se puede abrir otro y se ofrece continuar', { tag: '@RF-04' }, async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Continuar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir live' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Continuar' }).click();

  await expect(page).toHaveURL(/\/lives\/s-2$/);
  await expect(page.getByRole('combobox', { name: 'Anotación' })).toBeVisible();
});

test('tocar un live abre su pantalla', { tag: '@RF-04' }, async ({ page }) => {
  await live(page, 'Live jueves noche').getByRole('link').click();

  await expect(page).toHaveURL(/\/lives\/s-1$/);
  await expect(page.getByText('ya no se puede anotar')).toBeVisible();
});
