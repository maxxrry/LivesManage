import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-07 (ERS 3.5): marcar Pagada una línea de $17.000
// la destaca y sube el total pagado en $17.000.

const totalPagado = (page: Page) => page.getByTestId('total-pagado');
const linea = (page: Page, nombre: string) =>
  page.getByRole('list', { name: 'Hoja del live' }).getByRole('listitem').filter({ hasText: new RegExp(`^${nombre}`) });

test.beforeEach(async ({ page }) => {
  await page.goto('/lives/s-2');
  await expect(totalPagado(page)).toHaveText('$13.000');
});

test('marcar Pagada una línea de $17.000 la destaca y sube el total pagado', { tag: '@RF-07' }, async ({ page }) => {
  const gabriela = linea(page, 'Gabriela Peña');
  await expect(gabriela).toContainText('= $17.000');

  await page.getByRole('button', { name: 'Pagado: Gabriela Peña' }).tap();

  await expect(page.getByRole('button', { name: 'Pagado: Gabriela Peña' })).toHaveAttribute('aria-pressed', 'true');
  await expect(gabriela).toHaveClass(/bg-marca-50/);
  await expect(totalPagado(page)).toHaveText('$30.000');

  await page.getByRole('button', { name: 'Pagado: Gabriela Peña' }).tap();

  await expect(page.getByRole('button', { name: 'Pagado: Gabriela Peña' })).toHaveAttribute('aria-pressed', 'false');
  await expect(totalPagado(page)).toHaveText('$13.000');
});

test('el botón de pago mide al menos 44×44 px', { tag: '@RF-07' }, async ({ page }) => {
  const caja = await page.getByRole('button', { name: 'Pagado: Gabriela Peña' }).boundingBox();
  expect(caja?.width).toBeGreaterThanOrEqual(44);
  expect(caja?.height).toBeGreaterThanOrEqual(44);
});
