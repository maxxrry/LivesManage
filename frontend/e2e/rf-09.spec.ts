import { expect, test } from '@playwright/test';

// Criterio de aceptación de RF-09 (ERS 3.5): al terminar el live desaparece el campo
// de anotación y el avance cuenta las bolsas revisadas.

test('al terminar desaparece la anotación y el avance cuenta las bolsas', { tag: '@RF-09' }, async ({ page }) => {
  await page.goto('/lives/s-2');
  await expect(page.getByRole('combobox', { name: 'Anotación' })).toBeVisible();

  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();

  await expect(page).toHaveURL(/\/lives\/s-2\/cierre$/);
  await expect(page.getByRole('combobox', { name: 'Anotación' })).toHaveCount(0);
  await expect(page.getByTestId('avance-bolsas')).toHaveText('0 de 5');

  await page.getByRole('checkbox', { name: 'Bolsa revisada: Gabriela Peña' }).check();
  await page.getByRole('checkbox', { name: 'Bolsa revisada: Javiera Soto' }).check();
  await expect(page.getByTestId('avance-bolsas')).toHaveText('2 de 5');

  await page.getByRole('checkbox', { name: 'Bolsa revisada: Gabriela Peña' }).uncheck();
  await expect(page.getByTestId('avance-bolsas')).toHaveText('1 de 5');
});

test('tras terminar se puede abrir un live nuevo', { tag: '@RF-09' }, async ({ page, isMobile }) => {
  await page.goto('/lives/s-2');
  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();
  await expect(page).toHaveURL(/\/cierre$/);

  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click(); // en computador el menú está fijo
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Lives' }).click();

  await expect(page.getByRole('button', { name: 'Abrir live' })).toBeVisible();
});

test('el check de bolsa mide al menos 44 px de alto', { tag: '@RF-09' }, async ({ page }) => {
  await page.goto('/lives/s-2');
  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();

  const etiqueta = page.locator('label').filter({ has: page.getByRole('checkbox', { name: 'Bolsa revisada: Gabriela Peña' }) });
  const caja = (await etiqueta.boundingBox())!;
  expect(caja.height).toBeGreaterThanOrEqual(44);
  expect(caja.width).toBeGreaterThanOrEqual(44);
});
