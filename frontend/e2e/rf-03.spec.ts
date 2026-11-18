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

test('la Admin restablece la contraseña de la vendedora y esta entra con la nueva (D-49)', { tag: '@RF-03' }, async ({ page, isMobile }) => {
  await page.goto('/usuarios');
  await page.getByRole('button', { name: 'Restablecer la contraseña de Vendedora' }).click();
  const formulario = page.getByRole('form', { name: 'Contraseña de Vendedora' });
  await formulario.getByLabel('Contraseña nueva para Vendedora').fill('restablecida1');
  await formulario.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status')).toContainText('Se restableció la contraseña de Vendedora');
  await expect(page.getByRole('button', { name: 'Restablecer la contraseña de Administradora' })).toHaveCount(0); // la propia, no

  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByLabel('Correo').fill('vendedora@livesmanage.cl');
  await page.getByLabel('Contraseña').fill('restablecida1');
  await page.getByLabel('Contraseña').press('Enter');
  await expect(page).toHaveURL(/\/lives$/);
});

test('cada usuario cambia su contraseña desde el menú (D-49)', { tag: '@RF-01' }, async ({ page, isMobile }) => {
  await page.goto('/lives');
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('link', { name: 'Cambiar mi contraseña' }).click();

  const formulario = page.getByRole('form', { name: 'Cambiar mi contraseña' });
  await formulario.getByLabel('Contraseña actual').fill('mala-clave');
  await formulario.getByLabel('Contraseña nueva', { exact: true }).fill('nueva-clave-1');
  await formulario.getByLabel('Repite la contraseña nueva').fill('nueva-clave-1');
  await formulario.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(formulario.getByRole('alert')).toHaveText('La contraseña actual no es correcta.');

  await formulario.getByLabel('Contraseña actual').fill('admin123');
  await formulario.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(formulario.getByRole('status')).toContainText('Tu contraseña se cambió');

  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByLabel('Correo').fill('admin@livesmanage.cl');
  await page.getByLabel('Contraseña').fill('nueva-clave-1');
  await page.getByLabel('Contraseña').press('Enter');
  await expect(page).toHaveURL(/\/lives$/);
});
