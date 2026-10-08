import { expect, test, type Page } from '@playwright/test';

// Estas pruebas parten sin sesión.
test.use({ storageState: { cookies: [], origins: [] } });

async function ingresar(page: Page, correo: string, contrasena: string) {
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByLabel('Contraseña').press('Enter');
}

test('con credenciales válidas entra; al cerrar sesión vuelve al login', { tag: '@RF-01' }, async ({ page, isMobile }) => {
  await page.goto('/lives');
  await expect(page).toHaveURL(/\/login$/);

  await ingresar(page, 'admin@livesmanage.cl', 'admin123');
  await expect(page).toHaveURL(/\/lives$/);
  await expect(page.getByRole('heading', { name: 'Lives' })).toBeVisible();

  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  const salir = page.getByRole('button', { name: 'Cerrar sesión' });
  const caja = await salir.boundingBox();
  expect(caja?.height).toBeGreaterThanOrEqual(44);
  await salir.click();

  await expect(page).toHaveURL(/\/login$/);
  // El token se descartó: volver a una pantalla pide login de nuevo.
  await page.goto('/clientas');
  await expect(page).toHaveURL(/\/login$/);
});

test('con datos inválidos o usuario desactivado ve un mensaje genérico', { tag: '@RF-01' }, async ({ page }) => {
  await page.goto('/login');

  await ingresar(page, 'admin@livesmanage.cl', 'mala');
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');

  await page.getByLabel('Correo').fill('');
  await ingresar(page, 'antigua@livesmanage.cl', 'antigua123');
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
  await expect(page).toHaveURL(/\/login$/);

  const boton = await page.getByRole('button', { name: 'Ingresar' }).boundingBox();
  expect(boton?.height).toBeGreaterThanOrEqual(44);
});
