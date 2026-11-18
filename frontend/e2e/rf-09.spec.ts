import { expect, test } from '@playwright/test';

// Criterio de aceptación de RF-09 (ERS 3.5, D-47): al terminar el live desaparece el campo de anotación.
// Las bolsas ya no se revisan en el cierre: se registran en la ficha de la clienta.

test('al terminar desaparece la anotación y el cierre no pide bolsas', { tag: '@RF-09' }, async ({ page }) => {
  await page.goto('/lives/s-2');
  await expect(page.getByRole('combobox', { name: 'Anotación' })).toBeVisible();

  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();

  await expect(page).toHaveURL(/\/lives\/s-2\/cierre$/);
  await expect(page.getByRole('combobox', { name: 'Anotación' })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /Bolsa/ })).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
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

test('en el cierre, el lápiz agrega prendas a la línea (D-48)', { tag: '@RF-09' }, async ({ page }) => {
  await page.goto('/lives/s-2');
  await page.getByRole('button', { name: 'Terminar live' }).click();
  await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();
  await expect(page).toHaveURL(/\/cierre$/);

  await page.getByRole('button', { name: 'Editar línea de Florencia Ruiz' }).click();
  await expect(page.getByRole('button', { name: 'Cambiar clienta', exact: true })).toBeVisible();
  const precios = page.getByRole('textbox', { name: 'Agregar prendas' });
  await precios.fill('3000');
  await precios.press('Enter');

  const hoja = page.getByRole('list', { name: 'Hoja del live' });
  await expect(hoja.getByRole('listitem').filter({ hasText: 'Florencia Ruiz' })).toContainText('3.000');
});
