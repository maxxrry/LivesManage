import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-10 (ERS 3.5): Despacho exige dirección; una dirección nueva
// queda en la ficha; dos clientas agrupadas comparten dirección.

async function abrirCierre(page: Page) {
  await page.goto('/lives/s-2');
  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();
  await expect(page).toHaveURL(/\/cierre$/);
}

const entrega = (page: Page, nombre: string) => page.getByRole('group', { name: `Entrega de ${nombre}` });

test('despacho exige dirección y la dirección nueva se ofrece después desde la ficha', { tag: '@RF-10' }, async ({ page }) => {
  await abrirCierre(page);
  const gabriela = entrega(page, 'Gabriela Peña');

  await gabriela.getByRole('button', { name: 'Despacho' }).click();
  await gabriela.getByRole('textbox', { name: 'Calle y número' }).fill('Irarrázaval 3000');
  await gabriela.getByRole('textbox', { name: 'Comuna' }).fill(' ');
  await gabriela.getByRole('button', { name: 'Guardar' }).click();
  await expect(gabriela.getByRole('alert')).toHaveText('Falta la comuna de la dirección.');

  await gabriela.getByRole('textbox', { name: 'Comuna' }).fill('Ñuñoa');
  await gabriela.getByRole('button', { name: 'Guardar' }).click();
  await expect(gabriela.getByText('Irarrázaval 3000, Ñuñoa')).toBeVisible();
  await expect(gabriela.getByRole('button', { name: 'Despacho' })).toHaveAttribute('aria-pressed', 'true');

  // La dirección quedó en su ficha: al cambiarla, se ofrece como "la de su ficha".
  await gabriela.getByRole('button', { name: 'Cambiar dirección' }).click();
  await expect(gabriela.getByRole('button', { name: /Usar la de su ficha/ })).toContainText('Irarrázaval 3000, Ñuñoa');
});

test('dos clientas agrupadas comparten la dirección y cada una conserva su total', { tag: '@RF-10' }, async ({ page }) => {
  await abrirCierre(page);
  const javiera = entrega(page, 'Javiera Soto');
  const gabriela = entrega(page, 'Gabriela Peña');

  await javiera.getByRole('button', { name: 'Despacho' }).click();
  await javiera.getByRole('button', { name: /Usar la de su ficha/ }).click();
  await expect(javiera.getByText(/Los Aromos 1234, depto 52, Maipú/)).toBeVisible();

  await gabriela.getByRole('button', { name: 'Despacho' }).click();
  await gabriela.getByRole('button', { name: /Enviar junto con Javiera Soto/ }).click();

  await expect(gabriela.getByText(/Los Aromos 1234, depto 52, Maipú/)).toBeVisible();
  await expect(gabriela).toContainText('junto con Javiera Soto');
  await expect(javiera).toContainText('junto con Gabriela Peña');
  const hoja = page.getByRole('list', { name: 'Hoja del live' });
  await expect(hoja.getByRole('listitem').filter({ has: gabriela })).toContainText('= $17.000');
  await expect(hoja.getByRole('listitem').filter({ has: javiera })).toContainText('= $13.000');
});

test('los botones de forma de entrega miden al menos 44 px de alto', { tag: '@RF-10' }, async ({ page }) => {
  await abrirCierre(page);
  for (const nombre of ['Despacho', 'Retiro', 'Feria']) {
    const caja = await entrega(page, 'Florencia Ruiz').getByRole('button', { name: nombre }).boundingBox();
    expect(caja!.height).toBeGreaterThanOrEqual(44);
  }
});
