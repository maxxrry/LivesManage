import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-10 (ERS 3.5, D-47): en la ficha de la clienta, Despacho exige dirección y una
// dirección nueva queda en la ficha; las bolsas se cuentan y quedan En bodega o Entregadas, también con el live Cerrado.
// Los datos simulados viven en memoria: se navega por el menú, porque recargar la página los reinicia.

async function terminarLive(page: Page) {
  await page.goto('/lives/s-2');
  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();
  await expect(page).toHaveURL(/\/cierre$/);
}

async function irAClientas(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click(); // en computador el menú está fijo
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Clientas' }).click();
}

const lista = (page: Page) =>
  page.getByRole('list', { name: 'Lista de clientas' }).or(page.getByRole('table', { name: 'Lista de clientas' }));

/** Bolsas y entrega de una compra; s-1 (Cerrado) es del 24/09/2026 y s-2 del 29/09/2026. */
const compraDel = (page: Page, fecha: string) => page.getByRole('group', { name: `Bolsas y entrega del live ${fecha}` });

test('despacho exige dirección y la dirección nueva queda en la ficha', { tag: '@RF-10' }, async ({ page, isMobile }) => {
  await terminarLive(page);
  await irAClientas(page, isMobile);
  await lista(page).getByRole('link', { name: /Gabriela Peña/ }).click(); // sin dirección
  const entrega = compraDel(page, '29/09/2026').getByRole('group', { name: /Entrega de Gabriela Peña/ });

  await entrega.getByRole('button', { name: 'Despacho' }).click();
  await entrega.getByRole('textbox', { name: 'Calle y número' }).fill('Irarrázaval 3000');
  await entrega.getByRole('textbox', { name: 'Comuna' }).fill(' ');
  await entrega.getByRole('button', { name: 'Guardar' }).click();
  await expect(entrega.getByRole('alert')).toHaveText('Falta la comuna de la dirección.');

  await entrega.getByRole('textbox', { name: 'Comuna' }).fill('Ñuñoa');
  await entrega.getByRole('button', { name: 'Guardar' }).click();
  await expect(entrega.getByText('Irarrázaval 3000, Ñuñoa')).toBeVisible();
  await expect(entrega.getByRole('button', { name: 'Despacho' })).toHaveAttribute('aria-pressed', 'true');

  // La dirección quedó en su ficha: al cambiarla, se ofrece como "la de su ficha".
  await entrega.getByRole('button', { name: 'Cambiar dirección' }).click();
  await expect(entrega.getByRole('button', { name: /Usar la de su ficha/ })).toContainText('Irarrázaval 3000, Ñuñoa');
});

test('con el live Cerrado, las bolsas quedan En bodega, salen en el filtro y se marcan Entregadas', { tag: '@RF-10' }, async ({ page, isMobile }) => {
  await page.goto('/clientas/c-3'); // Javiera: 1 bolsa Entregada en el live jueves noche (Cerrado)
  await compraDel(page, '24/09/2026').getByRole('button', { name: 'Agregar una bolsa' }).click();
  await expect(compraDel(page, '24/09/2026').getByLabel('Bolsas')).toHaveText('2');
  await compraDel(page, '24/09/2026').getByRole('button', { name: 'En bodega' }).click();
  await expect(compraDel(page, '24/09/2026').getByRole('button', { name: 'En bodega' })).toHaveAttribute('aria-pressed', 'true');

  await irAClientas(page, isMobile);
  await page.getByRole('checkbox', { name: 'Con bolsas en bodega' }).check();
  await expect(lista(page)).toContainText('Javiera Soto');
  await expect(lista(page)).toContainText('2 bolsas en bodega');

  await lista(page).getByRole('link', { name: /Javiera Soto/ }).click();
  await compraDel(page, '24/09/2026').getByRole('button', { name: 'Entregada' }).click();
  await expect(compraDel(page, '24/09/2026').getByRole('button', { name: 'Entregada' })).toHaveAttribute('aria-pressed', 'true');
  await irAClientas(page, isMobile);
  await page.getByRole('checkbox', { name: 'Con bolsas en bodega' }).check();
  await expect(page.getByRole('status')).toHaveText('No hay bolsas en bodega.');
});

test('los botones de bolsas y entrega miden al menos 44 px', { tag: '@RF-10' }, async ({ page }) => {
  await page.goto('/clientas/c-3');
  const compra = compraDel(page, '24/09/2026');
  for (const nombre of ['Quitar una bolsa', 'Agregar una bolsa', 'En bodega', 'Entregada', 'Despacho', 'Retiro', 'Feria']) {
    const caja = (await compra.getByRole('button', { name: nombre }).boundingBox())!;
    expect(caja.height).toBeGreaterThanOrEqual(44);
    expect(caja.width).toBeGreaterThanOrEqual(44);
  }
});
