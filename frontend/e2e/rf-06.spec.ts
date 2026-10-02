import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-06 (ERS 3.5): quitar una prenda de $6.000 baja la línea
// y el total del live en $6.000; restaurarla los repone.

const totalLive = (page: Page) => page.getByTestId('total-live');
const linea = (page: Page, nombre: string) =>
  page.getByRole('list', { name: 'Hoja del live' }).getByRole('listitem').filter({ hasText: new RegExp(`^${nombre}`) });

test.beforeEach(async ({ page }) => {
  await page.goto('/lives/s-2');
  await expect(totalLive(page)).toHaveText('$58.000');
});

test('quitar una prenda de $6.000 y restaurarla', { tag: '@RF-06' }, async ({ page }) => {
  const gabriela = linea(page, 'Gabriela Peña');
  await expect(gabriela).toContainText('= $17.000');

  await gabriela.getByRole('button', { name: 'Cancelar prenda de $6.000' }).first().click();

  await expect(gabriela).toContainText('= $11.000');
  await expect(totalLive(page)).toHaveText('$52.000');

  await gabriela.getByRole('button', { name: 'Restaurar prenda de $6.000' }).click();

  await expect(gabriela).toContainText('= $17.000');
  await expect(totalLive(page)).toHaveText('$58.000');
});

test('las prendas son áreas táctiles de al menos 44×44 px', { tag: '@RF-06' }, async ({ page }) => {
  const caja = await linea(page, 'Gabriela Peña').getByRole('button', { name: /prenda de/ }).first().boundingBox();
  expect(caja?.width).toBeGreaterThanOrEqual(44);
  expect(caja?.height).toBeGreaterThanOrEqual(44);
});

test('cambiar la clienta a una que ya tiene línea une ambas', { tag: '@RF-06' }, async ({ page }) => {
  await page.getByRole('button', { name: 'Cambiar clienta de Gabriela Peña' }).click();
  await page.getByRole('combobox', { name: 'Buscar la clienta correcta' }).fill('flo');
  await page.getByRole('option', { name: /Florencia Ruiz/ }).click();
  await page.getByRole('button', { name: 'Unir' }).click();

  await expect(linea(page, 'Florencia Ruiz')).toContainText('= $27.000');
  await expect(linea(page, 'Gabriela Peña')).toHaveCount(0);
  await expect(totalLive(page)).toHaveText('$58.000');
});
