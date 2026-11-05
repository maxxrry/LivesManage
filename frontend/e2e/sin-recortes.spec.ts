import { expect, test, type Page } from '@playwright/test';

// RNF-15: nada se sale de la pantalla ni queda cortado. index.css recorta con overflow-x: hidden, así que medir el
// scroll no lo delata: se mide el borde de cada elemento visible y lo que esconde cada contenedor (salvo los "…" de truncate).
async function elementosFuera(page: Page) {
  return page.evaluate(() => {
    const ancho = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const caja = el.getBoundingClientRect();
        const estilo = getComputedStyle(el);
        const visible = caja.width > 0 && caja.height > 0 && estilo.visibility !== 'hidden';
        const escondeContenido =
          ['hidden', 'clip'].includes(estilo.overflowX) && el.scrollWidth > el.clientWidth + 1 && estilo.textOverflow !== 'ellipsis';
        return visible && !el.closest('.sr-only') && (caja.right > ancho + 1 || caja.left < -1 || escondeContenido);
      })
      .map((el) => `${el.tagName.toLowerCase()}: ${(el.textContent ?? '').trim().slice(0, 40)}`);
  });
}

const NOMBRE_LARGO = 'María José Fernanda de los Ángeles Pérez González';

async function liveConNombreLargo(page: Page) {
  await page.goto('/lives/s-2');
  const campo = page.getByRole('combobox', { name: 'Anotación' });
  await campo.fill(`${NOMBRE_LARGO} 120000 35000 3500 12000 6000 4000`);
  await page.getByRole('option', { name: /Nueva clienta/ }).click();
  await expect(page.getByRole('status')).toBeVisible();
}

// Los máximos que acepta ms-clientas (DatosClienta). El usuario de TikTok no tiene dónde partirse.
async function crearClientaLarga(page: Page) {
  await page.goto('/clientas');
  await page.getByRole('button', { name: 'Nueva clienta' }).click();
  const formulario = page.getByRole('form', { name: 'Nueva clienta' });
  await formulario.getByLabel('Nombre').fill(`${NOMBRE_LARGO} ${NOMBRE_LARGO}`.slice(0, 100));
  await formulario.getByLabel(/Usuario de TikTok/).fill(`@${'usuariotiktok'.repeat(5)}`.slice(0, 60));
  await formulario.getByLabel(/Teléfono/).fill('+56 9 1234 5678 / +56 9 8765 432');
  await formulario.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
}

const PANTALLAS: [string, (page: Page) => Promise<unknown>][] = [
  ['Lives', (page) => page.goto('/lives')],
  ['Live con un nombre y una línea largos', liveConNombreLargo],
  [
    'Panel del lápiz con un error',
    async (page) => {
      await liveConNombreLargo(page);
      await page.getByRole('button', { name: `Editar línea de ${NOMBRE_LARGO}` }).click();
      const precios = page.getByRole('textbox', { name: 'Agregar prendas' });
      await precios.fill('6 4');
      await precios.press('Enter');
      await expect(page.getByRole('alert')).toBeVisible();
    },
  ],
  [
    'Cambiar clienta',
    async (page) => {
      await liveConNombreLargo(page);
      await page.getByRole('button', { name: `Editar línea de ${NOMBRE_LARGO}` }).click();
      await page.getByRole('button', { name: 'Cambiar clienta', exact: true }).click();
    },
  ],
  [
    'Cierre con el formulario de despacho y el resumen',
    async (page) => {
      await liveConNombreLargo(page);
      await page.getByRole('button', { name: 'Terminar live' }).click();
      await page.getByRole('group', { name: 'Confirmar término' }).getByRole('button', { name: 'Terminar' }).click();
      await expect(page).toHaveURL(/\/cierre$/);
      await page.getByRole('group', { name: 'Entrega de Gabriela Peña' }).getByRole('button', { name: 'Despacho' }).click();
      await page.getByRole('button', { name: 'Finalizar cierre' }).click();
    },
  ],
  ['Clientas', (page) => page.goto('/clientas')],
  [
    'Nueva clienta',
    async (page) => {
      await page.goto('/clientas');
      await page.getByRole('button', { name: 'Nueva clienta' }).click();
    },
  ],
  [
    'Ficha de la clienta',
    async (page) => {
      await page.goto('/clientas/c-3');
      await expect(page.getByRole('region', { name: 'Indicadores' })).toBeVisible();
    },
  ],
  [
    'Editar la ficha',
    async (page) => {
      await page.goto('/clientas/c-3');
      await page.getByRole('button', { name: 'Editar' }).click();
    },
  ],
  ['Ficha con datos largos', crearClientaLarga],
  [
    'Lista de clientas con datos largos',
    async (page) => {
      await crearClientaLarga(page);
      const abrirMenu = page.getByRole('button', { name: 'Abrir menú' });
      if (await abrirMenu.isVisible()) await abrirMenu.click();
      await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Clientas' }).click();
      await expect(page.getByRole('searchbox', { name: 'Buscar clientas' })).toBeVisible();
    },
  ],
  [
    'Estadísticas: Lives',
    async (page) => {
      await page.clock.setFixedTime(new Date('2026-10-04T12:00:00-03:00'));
      await page.goto('/estadisticas');
    },
  ],
  [
    'Estadísticas: Ranking',
    async (page) => {
      await page.clock.setFixedTime(new Date('2026-10-04T12:00:00-03:00'));
      await page.goto('/estadisticas');
      await page.getByRole('button', { name: 'Ranking' }).click();
    },
  ],
  [
    'Estadísticas: Inactivas',
    async (page) => {
      await page.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
      await page.goto('/estadisticas');
      await page.getByRole('button', { name: 'Inactivas' }).click();
    },
  ],
  ['Usuarios', (page) => page.goto('/usuarios')],
  [
    'Nuevo usuario',
    async (page) => {
      await page.goto('/usuarios');
      await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    },
  ],
];

for (const [nombre, abrir] of PANTALLAS) {
  test(`nada se sale de la pantalla: ${nombre}`, { tag: '@RNF-15' }, async ({ page }, info) => {
    await abrir(page);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // una pantalla vacía no cuenta como aprobada
    expect(await elementosFuera(page)).toEqual([]);

    // 1024 px es lo más estrecho del diseño de computador: menú fijo y tablas (D-24).
    if (info.project.name === 'escritorio') {
      await page.setViewportSize({ width: 1024, height: 800 });
      expect(await elementosFuera(page)).toEqual([]);
    }
  });
}

test.describe('sin sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('nada se sale de la pantalla: Login', { tag: '@RNF-15' }, async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Correo')).toBeVisible();
    expect(await elementosFuera(page)).toEqual([]);
  });
});
