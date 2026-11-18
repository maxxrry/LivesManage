import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-11 (ERS 3.5, D-47): no se puede finalizar con líneas Pendientes;
// bolsas y entrega no se exigen. Al finalizar, el live queda de solo lectura.

const PENDIENTES = ['Gabriela Peña', 'Florencia Ruiz', 'Camila Rojas', 'Antonia Muñoz'];

async function abrirCierre(page: Page) {
  await page.goto('/lives/s-2');
  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();
  await expect(page).toHaveURL(/\/cierre$/);
}

test('no se finaliza con Pendientes; al finalizar queda de solo lectura', { tag: '@RF-11' }, async ({ page }) => {
  await abrirCierre(page);
  await page.getByRole('button', { name: 'Finalizar cierre' }).click();
  const cerrar = page.getByRole('button', { name: 'Cerrar el live' });

  await expect(cerrar).toBeDisabled(); // hay Pendientes
  await expect(page.getByText(/bolsa/i)).toHaveCount(0); // D-47: las bolsas van en la ficha

  for (const nombre of PENDIENTES) await page.getByRole('button', { name: `No pagó: ${nombre}` }).click();
  await expect(page.getByTestId('resumen-cierre')).toContainText('Sin pagar$45.000');
  await cerrar.click();

  await expect(page).toHaveURL(/\/lives\/s-2$/);
  await expect(page.getByRole('heading', { name: 'Live martes' })).toBeVisible();
  await expect(page.getByText('Estado: Cerrada. Ya no se puede anotar.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Cancelar prenda/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Pagado:/ })).toHaveCount(0);
});

test('la administradora reabre un live Cerrado y vuelve a En cierre', { tag: '@RF-11' }, async ({ page }) => {
  await page.goto('/lives/s-1');
  await page.getByRole('button', { name: 'Reabrir cierre' }).click();
  await page.getByRole('group', { name: 'Confirmar reapertura' }).getByRole('button', { name: 'Reabrir' }).click();

  await expect(page).toHaveURL(/\/lives\/s-1\/cierre$/);
  await expect(page.getByRole('heading', { name: 'Cierre: Live jueves noche' })).toBeVisible();
});

test('el botón No pagó mide al menos 44 px de alto', { tag: '@RF-11' }, async ({ page }) => {
  await abrirCierre(page);
  await page.getByRole('button', { name: 'Finalizar cierre' }).click();

  const caja = await page.getByRole('button', { name: 'No pagó: Gabriela Peña' }).boundingBox();
  expect(caja!.height).toBeGreaterThanOrEqual(44);
});
