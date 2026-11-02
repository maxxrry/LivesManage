import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-05 (ERS 3.5), en el live Abierto de los datos simulados.
// Cada test carga la página de nuevo, así que parte con los datos iniciales.

const campo = (page: Page) => page.getByRole('combobox', { name: 'Anotación' });
const totalLive = (page: Page) => page.getByTestId('total-live');
const linea = (page: Page, nombre: string) =>
  page.getByRole('list', { name: 'Hoja del live' }).getByRole('listitem').filter({ hasText: new RegExp(`^${nombre}`) });

test.beforeEach(async ({ page }) => {
  await page.goto('/lives/s-2');
  await expect(totalLive(page)).toHaveText('$58.000');
});

test('"flo 6000 4000" suma $10.000 a la línea existente de Florencia', { tag: '@RF-05' }, async ({ page }) => {
  await expect(linea(page, 'Florencia Ruiz')).toContainText('= $10.000');

  await campo(page).fill('flo 6000 4000');
  await page.getByRole('button', { name: 'Agregar' }).click();

  await expect(page.getByRole('status')).toHaveText(/Florencia Ruiz: 6\.000 4\.000 = \$10\.000/);
  await expect(linea(page, 'Florencia Ruiz')).toContainText('6.000 4.000 6.000 4.000= $20.000');
  await expect(totalLive(page)).toHaveText('$68.000');
  await expect(campo(page)).toHaveValue('');
  // La línea modificada queda arriba en la hoja.
  await expect(page.getByRole('list', { name: 'Hoja del live' }).getByRole('listitem').first()).toContainText('Florencia Ruiz');
});

test('"ana 5000" crea clienta y línea', { tag: '@RF-05' }, async ({ page }) => {
  await campo(page).fill('ana 5000');
  await campo(page).press('Enter');

  await expect(linea(page, 'ana')).toContainText('5.000= $5.000');
  await expect(totalLive(page)).toHaveText('$63.000');
});

test('"flo 6000-" muestra error y conserva el texto', { tag: '@RF-05' }, async ({ page }) => {
  await campo(page).fill('flo 6000-');
  await campo(page).press('Enter');

  await expect(page.getByRole('alert')).toContainText('Falta un precio después del guion');
  await expect(campo(page)).toHaveValue('flo 6000-');
  await expect(totalLive(page)).toHaveText('$58.000');
});

test('"flo 6 4" en miles da error y no crea una clienta', { tag: '@RF-05' }, async ({ page }) => {
  await campo(page).fill('flo 6 4');
  await campo(page).press('Enter');

  await expect(page.getByRole('alert')).toContainText('Escribe los precios completos');
  await expect(campo(page)).toHaveValue('flo 6 4');
  await expect(totalLive(page)).toHaveText('$58.000');
});

test('"flo 3.500" anota un precio que no es miles exactos', { tag: '@RF-05' }, async ({ page }) => {
  await campo(page).fill('flo 3.500');
  await campo(page).press('Enter');

  await expect(linea(page, 'Florencia Ruiz')).toContainText('= $13.500');
  await expect(totalLive(page)).toHaveText('$61.500');
});

test('Deshacer quita lo recién anotado', { tag: '@RF-05' }, async ({ page }) => {
  await campo(page).fill('flo 6000 4000');
  await campo(page).press('Enter');
  await expect(totalLive(page)).toHaveText('$68.000');

  await page.getByRole('button', { name: 'Deshacer' }).click();

  await expect(totalLive(page)).toHaveText('$58.000');
  await expect(linea(page, 'Florencia Ruiz')).toContainText('= $10.000');
});
