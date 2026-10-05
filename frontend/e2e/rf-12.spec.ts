import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-12 (ERS 3.5): crear una clienta con un usuario de TikTok
// ya registrado muestra aviso de duplicado.

// Celular: tarjetas (lista). Computador: tabla (D-24). getByRole ignora la versión oculta.
const lista = (page: Page) =>
  page.getByRole('list', { name: 'Lista de clientas' }).or(page.getByRole('table', { name: 'Lista de clientas' }));

test.beforeEach(async ({ page }) => {
  await page.goto('/clientas');
});

test('un usuario de TikTok ya registrado muestra aviso de duplicado', { tag: '@RF-12' }, async ({ page }) => {
  await page.getByRole('button', { name: 'Nueva clienta' }).click();
  const formulario = page.getByRole('form', { name: 'Nueva clienta' });
  await formulario.getByLabel('Nombre').fill('Gabi');
  await formulario.getByLabel(/Usuario de TikTok/).fill('@Gabi.Pena');
  await formulario.getByLabel(/Teléfono/).focus(); // al salir del campo se revisa

  await expect(formulario.getByText(/Ese usuario de TikTok ya es de/)).toContainText('Gabriela Peña');

  await formulario.getByRole('button', { name: 'Guardar' }).click();
  await expect(formulario.getByRole('alert')).toContainText('ya tiene otra clienta');
  await formulario.getByRole('button', { name: 'Guardar igual' }).click();

  await expect(page.getByRole('heading', { name: 'Gabi', exact: true })).toBeVisible();
});

test('busca por nombre, usuario de TikTok o teléfono', { tag: '@RF-12' }, async ({ page }) => {
  const buscar = page.getByRole('searchbox', { name: 'Buscar clientas' });

  await buscar.fill('pena');
  await expect(lista(page).getByRole('link')).toHaveCount(1);
  await expect(lista(page)).toContainText('Gabriela Peña');

  await buscar.fill('@javi');
  await expect(lista(page)).toContainText('Javiera Soto');
  await expect(lista(page).getByRole('link')).toHaveCount(1);

  await buscar.fill('8765');
  await expect(lista(page)).toContainText('Florencia Ruiz');
});

test('editar los datos desde la ficha', { tag: '@RF-12' }, async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Buscar clientas' }).fill('camila');
  await lista(page).getByRole('link', { name: /Camila Rojas/ }).click();

  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel(/Teléfono/).fill('+56 9 1111 2222');
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('+56 9 1111 2222')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
});
