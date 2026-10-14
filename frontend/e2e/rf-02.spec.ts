import { expect, test } from '@playwright/test';

// Parte sin sesión: entra como Vendedora.
test.use({ storageState: { cookies: [], origins: [] } });

test('no ve Usuarios en el menú ni puede abrir la pantalla', { tag: '@RF-02' }, async ({ page, isMobile }) => {
  await page.goto('/login');
  await page.getByLabel('Correo').fill('vendedora@livesmanage.cl');
  await page.getByLabel('Contraseña').fill('vende123');
  await page.getByLabel('Contraseña').press('Enter');
  await expect(page).toHaveURL(/\/lives$/);

  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('navigation', { name: 'Menú principal' });
  await expect(menu.getByRole('link', { name: 'Clientas' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);

  await page.goto('/usuarios');
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para ver esta pantalla');
  await expect(page.getByRole('button', { name: 'Nuevo usuario' })).toHaveCount(0);
});
