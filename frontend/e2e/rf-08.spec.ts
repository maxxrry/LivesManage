import { expect, test, type Page } from '@playwright/test';

// Criterio de aceptación de RF-08 (ERS 3.5): tras cada acción, el total del live
// es igual a la suma de las líneas visibles (sin búsqueda activa, D-23).

const hoja = (page: Page) => page.getByRole('list', { name: 'Hoja del live' });
const linea = (page: Page, nombre: string) => hoja(page).getByRole('listitem').filter({ hasText: new RegExp(`^${nombre}`) });
const clp = (texto: string) => Number(texto.replace(/\D/g, ''));

async function verificarSuma(page: Page) {
  const textos = await hoja(page).getByRole('listitem').allTextContents();
  const suma = textos.reduce((s, t) => s + clp(t.match(/= (\$[\d.]+)/)![1]!), 0);
  expect(suma).toBe(clp(await page.getByTestId('total-live').innerText()));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/lives/s-2');
  await expect(page.getByTestId('total-live')).toHaveText('$58.000');
});

test('tras anotar, cancelar y pagar, el total es la suma de las líneas visibles', { tag: '@RF-08' }, async ({ page }) => {
  await expect(page.getByTestId('total-pendiente')).toHaveText('$45.000');
  await expect(page.getByTestId('total-clientas')).toHaveText('5');
  await verificarSuma(page);

  await page.getByRole('combobox', { name: 'Anotación' }).fill('ana 5');
  await page.getByRole('combobox', { name: 'Anotación' }).press('Enter');
  await expect(page.getByTestId('total-live')).toHaveText('$63.000');
  await expect(page.getByTestId('total-clientas')).toHaveText('6');
  await verificarSuma(page);

  await linea(page, 'Gabriela Peña').getByRole('button', { name: 'Cancelar prenda de $6.000' }).first().tap();
  await expect(page.getByTestId('total-live')).toHaveText('$57.000');
  await verificarSuma(page);

  await page.getByRole('button', { name: 'Pagado: Gabriela Peña' }).tap();
  await expect(page.getByTestId('total-pagado')).toHaveText('$24.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$33.000');
  await verificarSuma(page);
});

test('la búsqueda filtra la hoja sin cambiar los totales del live', { tag: '@RF-08' }, async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Buscar en la hoja' }).fill('flo');

  await expect(hoja(page).getByRole('listitem')).toHaveCount(1);
  await expect(page.getByText('Mostrando 1 de 5 clientas')).toBeVisible();
  await expect(page.getByTestId('total-live')).toHaveText('$58.000');
});

test.describe('en computador', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('totales en una fila, hoja en dos columnas y sin scroll horizontal', { tag: '@RF-08' }, async ({ page }) => {
    const [primera, segunda] = await hoja(page).getByRole('listitem').all();
    const a = (await primera!.boundingBox())!;
    const b = (await segunda!.boundingBox())!;
    expect(b.y).toBe(a.y); // misma fila: dos columnas
    expect(b.x).toBeGreaterThan(a.x);

    const total = (await page.getByTestId('total-live').boundingBox())!;
    const clientas = (await page.getByTestId('total-clientas').boundingBox())!;
    expect(Math.abs(clientas.y - total.y)).toBeLessThan(5); // los 4 totales en una fila

    const anchos = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(anchos[0]).toBeLessThanOrEqual(anchos[1]!);
  });
});
