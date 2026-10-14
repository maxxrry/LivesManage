import { expect, test, type Page } from '@playwright/test';

// Parten con la Admin conectada (storageState de playwright.config.ts).

async function crearUsuario(page: Page, nombre: string, correo: string) {
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  const formulario = page.getByRole('form', { name: 'Nuevo usuario' });
  await formulario.getByLabel('Nombre').fill(nombre);
  await formulario.getByLabel('Correo').fill(correo);
  await formulario.getByLabel('Rol').selectOption({ label: 'Vendedor' });
  await formulario.getByLabel('Contraseña inicial').fill('inicial123');
  await formulario.getByRole('button', { name: 'Crear usuario' }).click();
}

test('la Admin crea una vendedora que luego inicia sesión', { tag: '@RF-03' }, async ({ page, isMobile }) => {
  await page.goto('/usuarios');
  await crearUsuario(page, 'Camila Rojas', 'camila@livesmanage.cl');

  await expect(page.getByRole('status')).toContainText('Camila Rojas fue creado');
  await expect(page.getByRole('list', { name: 'Lista de usuarios' })).toContainText('camila@livesmanage.cl');

  // Sin recargar (los datos simulados viven en memoria): cerrar sesión y entrar como la nueva vendedora.
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByLabel('Correo').fill('camila@livesmanage.cl');
  await page.getByLabel('Contraseña').fill('inicial123');
  await page.getByLabel('Contraseña').press('Enter');

  await expect(page).toHaveURL(/\/lives$/);
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('navigation', { name: 'Menú principal' })).toContainText('Camila Rojas');
});

test('un correo repetido se rechaza', { tag: '@RF-03' }, async ({ page }) => {
  await page.goto('/usuarios');
  await crearUsuario(page, 'Otra vendedora', 'Vendedora@LivesManage.cl');

  await expect(page.getByRole('form', { name: 'Nuevo usuario' }).getByRole('alert')).toHaveText('Ya existe un usuario con ese correo.');
});

test('desactivar pide confirmación y la Admin no puede desactivarse', { tag: '@RF-03' }, async ({ page }) => {
  await page.goto('/usuarios');

  await expect(page.getByRole('button', { name: 'Desactivar a Administradora' })).toHaveCount(0);

  const desactivar = page.getByRole('button', { name: 'Desactivar a Vendedora' });
  expect((await desactivar.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await desactivar.click();
  await page.getByRole('group', { name: 'Confirmar desactivación' }).getByRole('button', { name: 'Desactivar' }).click();

  await expect(page.getByRole('status')).toHaveText('Vendedora quedó desactivado.');
  await expect(page.getByRole('button', { name: 'Reactivar a Vendedora' })).toBeVisible();
});
