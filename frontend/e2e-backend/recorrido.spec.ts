import { expect, test, type Page } from '@playwright/test';
import { ADMIN, GATEWAY } from '../playwright.backend.config';

// Un live completo con todos los servicios de verdad (D-43). La base H2 parte vacía en cada corrida.

async function ingresar(page: Page, correo: string, contrasena: string) {
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByLabel('Contraseña').press('Enter');
}

const indicador = (page: Page, nombre: string) =>
  page.getByRole('region', { name: 'Indicadores' }).locator('div').filter({ hasText: nombre }).getByRole('definition');

test(
  'un live de punta a punta: anotar, corregir, cerrar, ver la ficha y las estadísticas',
  { tag: ['@RF-01', '@RF-02', '@RF-03', '@RF-04', '@RF-05', '@RF-06', '@RF-07', '@RF-09', '@RF-10', '@RF-11', '@RF-13', '@RF-14'] },
  async ({ page }) => {
    const anotacion = page.getByRole('combobox', { name: 'Anotación' });
    const total = page.getByTestId('total-live');

    await test.step('login: rechaza una contraseña mala y entra con la correcta', async () => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/login$/);
      await ingresar(page, ADMIN.correo, 'contrasena-mala');
      await expect(page.getByRole('alert')).toBeVisible();
      await ingresar(page, ADMIN.correo, ADMIN.contrasena);
      await expect(page).toHaveURL(/\/lives$/);
    });

    await test.step('abrir un live', async () => {
      await page.getByRole('button', { name: 'Abrir live' }).click();
      await page.getByPlaceholder('Live jueves noche').fill('Live de prueba');
      await page.getByRole('button', { name: 'Abrir', exact: true }).click();
      await expect(page).toHaveURL(/\/lives\/[^/]+$/);
    });

    await test.step('anotar una clienta nueva, y el dato sobrevive a recargar', async () => {
      await anotacion.fill('flo 6000 4000');
      await anotacion.press('Enter');
      await expect(page.getByRole('status')).toContainText('flo: 6.000 4.000 = $10.000');
      await expect(total).toHaveText('$10.000');
      await page.reload();
      await expect(total).toHaveText('$10.000');
    });

    await test.step('un precio de $3.500 se guarda, y Deshacer también borra la clienta creada', async () => {
      await anotacion.fill('ana 3.500');
      await anotacion.press('Enter');
      await expect(total).toHaveText('$13.500');
      await page.getByRole('button', { name: 'Deshacer' }).click();
      await expect(total).toHaveText('$10.000');
    });

    await test.step('la sintaxis en miles da error y no anota', async () => {
      await anotacion.fill('flo 6 4');
      await anotacion.press('Enter');
      await expect(page.getByRole('alert')).toContainText('Escribe los precios completos');
      await expect(total).toHaveText('$10.000');
      await anotacion.clear();
    });

    await test.step('volver a anotar suma a su línea, sin crear otra', async () => {
      await anotacion.fill('flo 5000');
      await anotacion.press('Enter');
      await expect(total).toHaveText('$15.000');
      await expect(page.getByRole('list', { name: 'Hoja del live' }).getByRole('listitem')).toHaveCount(1);
    });

    await test.step('agregar desde el lápiz y cancelar una prenda', async () => {
      await page.getByRole('button', { name: 'Editar línea de flo' }).click();
      const precios = page.getByRole('textbox', { name: 'Agregar prendas' });
      await precios.fill('3000');
      await precios.press('Enter');
      await expect(total).toHaveText('$18.000');
      await page.getByRole('button', { name: 'Cancelar prenda de $3.000' }).click();
      await expect(total).toHaveText('$15.000');
    });

    await test.step('terminar y cerrar: bolsa, pago y entrega', async () => {
      await page.getByRole('button', { name: 'Terminar live' }).click();
      await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();
      await expect(page).toHaveURL(/\/cierre$/);
      // Se marca cuando responde el servidor: check() lo revisaría antes de tiempo.
      await page.getByRole('checkbox', { name: 'Bolsa revisada: flo' }).click();
      await expect(page.getByTestId('avance-bolsas')).toHaveText('1 de 1');
      await page.getByRole('button', { name: 'Pagado: flo' }).click();
      const entrega = page.getByRole('group', { name: 'Entrega de flo' });
      await entrega.getByRole('button', { name: 'Retiro' }).click();
      await expect(entrega.getByRole('button', { name: 'Retiro' })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: 'Finalizar cierre' }).click();
      await page.getByRole('button', { name: 'Cerrar el live' }).click();
      await expect(page.getByText('Estado: Cerrada. Ya no se puede anotar.')).toBeVisible();
    });

    await test.step('la ficha muestra los indicadores que calcula ms-clientas', async () => {
      await page.goto('/clientas');
      const fichas = page.getByRole('list', { name: 'Lista de clientas' }).getByRole('link');
      await expect(fichas).toHaveText([/flo/]); // Deshacer borró a ana
      await fichas.click();
      await expect(indicador(page, 'Total gastado')).toHaveText('$15.000');
      await expect(indicador(page, 'Compras')).toHaveText('1');
      await expect(indicador(page, 'Ticket promedio')).toHaveText('$15.000');
      await expect(indicador(page, 'Prendas canceladas')).toHaveText('1');
      await expect(indicador(page, 'Lives sin pago')).toHaveText('0');
    });

    await test.step('ranking e inactivas', async () => {
      await page.goto('/estadisticas');
      await page.getByRole('button', { name: 'Ranking' }).click();
      const ranking = page.getByRole('list', { name: 'Ranking de clientas' });
      await expect(ranking).toContainText('flo');
      await expect(ranking).toContainText('$15.000');
      await page.getByRole('button', { name: 'Inactivas' }).click();
      await expect(page.getByRole('status')).toHaveText('No hay clientas inactivas.');
    });

    await test.step('la Admin crea una vendedora, que entra pero no ve Usuarios y la API le responde 403', async () => {
      await page.goto('/usuarios');
      await page.getByRole('button', { name: 'Nuevo usuario' }).click();
      const formulario = page.getByRole('form', { name: 'Nuevo usuario' });
      await formulario.getByLabel('Nombre').fill('Camila Rojas');
      await formulario.getByLabel('Correo').fill('camila-e2e@livesmanage.cl');
      await formulario.getByLabel('Rol').selectOption({ label: 'Vendedor' });
      await formulario.getByLabel('Contraseña inicial').fill('inicial123');
      await formulario.getByRole('button', { name: 'Crear usuario' }).click();
      await expect(page.getByRole('status')).toContainText('Camila Rojas fue creado');

      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      await ingresar(page, 'camila-e2e@livesmanage.cl', 'inicial123');
      await expect(page).toHaveURL(/\/lives$/);
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await expect(page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Clientas' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);

      const estado = await page.evaluate(async (gateway) => {
        const { token } = JSON.parse(localStorage.getItem('livesmanage.sesion') ?? '{}') as { token?: string };
        return (await fetch(`${gateway}/api/usuarios`, { headers: { Authorization: `Bearer ${token}` } })).status;
      }, GATEWAY);
      expect(estado).toBe(403);
    });
  },
);
