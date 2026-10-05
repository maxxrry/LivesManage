import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rutas } from '../../app/router';
import { clientas, lineas, sesiones, usuarios } from '../../services/mock/datos';
import { historialDeClienta } from '../../services/sesionesService';

// El historial real, salvo en el test que simula una falla.
vi.mock('../../services/sesionesService', async (original) => {
  const real = await original<typeof import('../../services/sesionesService')>();
  return { ...real, historialDeClienta: vi.fn(real.historialDeClienta) };
});

function abrir(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<RouterProvider router={router} />);
  return { usuario: userEvent.setup(), router };
}

const nombresEnLista = async () =>
  within(await screen.findByRole('list', { name: 'Lista de clientas' }))
    .getAllByRole('link')
    .map((a) => a.textContent?.split(/Desactivada|@|\+/)[0]?.trim());

describe('Clientas (RF-12)', () => {
  it('crear una clienta con un usuario de TikTok ya registrado muestra aviso de duplicado', async () => {
    const { usuario } = abrir('/clientas');
    await usuario.click(await screen.findByRole('button', { name: 'Nueva clienta' }));

    await usuario.type(screen.getByLabelText('Nombre'), 'Gabi');
    await usuario.type(screen.getByLabelText(/Usuario de TikTok/), 'Gabi.Pena');
    await usuario.tab(); // al salir del campo se revisa

    expect(await screen.findByText(/Ese usuario de TikTok ya es de/)).toHaveTextContent('Gabriela Peña');
    const formulario = screen.getByRole('form', { name: 'Nueva clienta' });
    expect(within(formulario).getByRole('link', { name: 'Gabriela Peña' })).toHaveAttribute('href', '/clientas/c-1');
  });

  it('el aviso no bloquea: pide confirmar y "Guardar igual" crea la clienta (D-28)', async () => {
    const { usuario, router } = abrir('/clientas');
    await usuario.click(await screen.findByRole('button', { name: 'Nueva clienta' }));
    await usuario.type(screen.getByLabelText('Nombre'), 'Gabi');
    await usuario.type(screen.getByLabelText(/Usuario de TikTok/), '@gabi.pena');

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ya tiene otra clienta');
    await usuario.click(screen.getByRole('button', { name: 'Guardar igual' }));

    expect(await screen.findByRole('heading', { name: 'Gabi' })).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/clientas\/c-\d+$/);
  });

  it('si tras confirmar se cambia el teléfono por otro duplicado, vuelve a avisar antes de guardar', async () => {
    const { usuario, router } = abrir('/clientas');
    await usuario.click(await screen.findByRole('button', { name: 'Nueva clienta' }));
    await usuario.type(screen.getByLabelText('Nombre'), 'Gabi');
    await usuario.type(screen.getByLabelText(/Usuario de TikTok/), '@gabi.pena');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('button', { name: 'Guardar igual' })).toBeInTheDocument();

    // Cambia el teléfono al de Javiera y presiona Enter sin salir del campo.
    await usuario.type(screen.getByLabelText(/Teléfono/), '912345678{Enter}');

    expect(await screen.findByText(/Ese teléfono ya es de/)).toHaveTextContent('Javiera Soto');
    expect(router.state.location.pathname).toBe('/clientas');
    expect(clientas.filter((c) => c.nombre === 'Gabi')).toHaveLength(0);
  });

  it('una clienta sin duplicados se crea con un solo Guardar', async () => {
    const { usuario } = abrir('/clientas');
    await usuario.click(await screen.findByRole('button', { name: 'Nueva clienta' }));
    await usuario.type(screen.getByLabelText('Nombre'), 'Ana Rojas');
    await usuario.type(screen.getByLabelText(/Teléfono/), '+56 9 5555 4444');

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('heading', { name: 'Ana Rojas' })).toBeInTheDocument();
    expect(screen.getByText('+56 9 5555 4444')).toBeInTheDocument();
  });

  it('busca por nombre, usuario de TikTok o teléfono', async () => {
    const { usuario } = abrir('/clientas');
    const buscar = await screen.findByRole('searchbox', { name: 'Buscar clientas' });

    await usuario.type(buscar, 'pena');
    expect(await nombresEnLista()).toEqual(['Gabriela Peña']);

    await usuario.clear(buscar);
    await usuario.type(buscar, '@javi');
    expect(await nombresEnLista()).toEqual(['Javiera Soto']);

    await usuario.clear(buscar);
    await usuario.type(buscar, '8765');
    expect(await nombresEnLista()).toEqual(['Florencia Ruiz']);
  });

  it('las desactivadas se ocultan salvo con "Mostrar desactivadas"', async () => {
    clientas.find((c) => c.id === 'c-4')!.activa = false;
    const { usuario } = abrir('/clientas');

    expect(await nombresEnLista()).not.toContain('Camila Rojas');
    await usuario.click(screen.getByRole('checkbox', { name: 'Mostrar desactivadas' }));
    expect(await nombresEnLista()).toContain('Camila Rojas');
  });
});

describe('Ficha: editar y desactivar (RF-12)', () => {
  it('editar completa los datos y renombrar actualiza sus líneas (D-28)', async () => {
    const { usuario } = abrir('/clientas/c-4');
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));

    const nombre = screen.getByLabelText('Nombre');
    await usuario.clear(nombre);
    await usuario.type(nombre, 'Camila Rojas Díaz');
    await usuario.type(screen.getByLabelText(/Teléfono/), '+56 9 1111 2222');
    await usuario.type(screen.getByLabelText(/Calle y número/), 'Av. Central 100');
    await usuario.type(screen.getByLabelText(/^Comuna/), 'Ñuñoa');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('heading', { name: 'Camila Rojas Díaz' })).toBeInTheDocument();
    expect(screen.getByText('Av. Central 100, Ñuñoa')).toBeInTheDocument();
    expect(lineas.filter((l) => l.clientaId === 'c-4').every((l) => l.clientaNombre === 'Camila Rojas Díaz')).toBe(true);
  });

  it('seguir el enlace del aviso abre la otra ficha sin el formulario de la anterior', async () => {
    const { usuario } = abrir('/clientas/c-1');
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));
    await usuario.type(screen.getByLabelText(/Teléfono/), '912345678');
    await usuario.tab();

    await usuario.click(await screen.findByRole('link', { name: 'Javiera Soto' }));

    expect(await screen.findByRole('heading', { name: 'Javiera Soto' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Editar clienta' })).not.toBeInTheDocument();
    expect(screen.getByText('@javisoto')).toBeInTheDocument();
  });

  it('la administradora desactiva con confirmación y puede reactivar', async () => {
    const { usuario } = abrir('/clientas/c-1');

    await usuario.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const confirmar = screen.getByRole('group', { name: 'Confirmar desactivación' });
    await usuario.click(within(confirmar).getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText(/Clienta desactivada/)).toBeInTheDocument();
    expect(clientas.find((c) => c.id === 'c-1')!.activa).toBe(false);

    await usuario.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByRole('button', { name: 'Desactivar' })).toBeInTheDocument();
  });

  it('una vendedora no ve Desactivar', async () => {
    usuarios[0]!.rol = 'VENDEDOR';
    try {
      abrir('/clientas/c-1');
      expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    } finally {
      usuarios[0]!.rol = 'ADMIN';
    }
  });
});

/** Valor de un indicador de la ficha (dt → dd). */
const indicador = (nombre: string) =>
  within(screen.getByRole('region', { name: 'Indicadores' })).getByText(nombre).nextElementSibling?.textContent;

const filasHistorial = async () =>
  within(await screen.findByRole('list', { name: 'Historial por live' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('Ficha: historial e indicadores (RF-13)', () => {
  it('muestra el historial por live, el más reciente primero, con prendas, total, pago y entrega', async () => {
    abrir('/clientas/c-3'); // Javiera: live martes (Abierto, retiro) y live jueves (Cerrado, despacho)

    const [martes, jueves] = await filasHistorial();
    expect(martes).toMatch(/29\/09\/2026.*Live martes.*Abierta.*8-5.*\$13\.000.*Pagado.*Retiro/);
    expect(jueves).toMatch(/24\/09\/2026.*Live jueves noche.*7-5.*\$12\.000.*Pagado.*Despacho/);
    expect(jueves).not.toMatch(/Cerrada/);
  });

  it('los indicadores cuentan solo los lives cerrados (D-29)', async () => {
    abrir('/clientas/c-3');
    await filasHistorial();

    expect(indicador('Total gastado')).toBe('$12.000'); // los $13.000 del live Abierto no cuentan
    expect(indicador('Compras')).toBe('1');
    expect(indicador('Ticket promedio')).toBe('$12.000');
    expect(indicador('Última compra')).toBe('24/09/2026');
  });

  it('criterio de aceptación: al cerrar el live, su línea Pagada suma al total gastado', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'CERRADA';
    abrir('/clientas/c-3');
    await filasHistorial();

    expect(indicador('Total gastado')).toBe('$25.000');
    expect(indicador('Compras')).toBe('2');
    expect(indicador('Ticket promedio')).toBe('$12.500');
    expect(indicador('Última compra')).toBe('29/09/2026');
  });

  it('una clienta que no pagó: lives sin pago y sin total gastado', async () => {
    abrir('/clientas/c-1'); // Gabriela: No pagó en el live jueves

    expect((await filasHistorial())[1]).toMatch(/No pagó/);
    expect(indicador('Lives sin pago')).toBe('1');
    expect(indicador('Total gastado')).toBe('$0');
    expect(indicador('Última compra')).toBe('—');
  });

  it('las prendas canceladas se ven tachadas', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'CERRADA';
    abrir('/clientas/c-4'); // Camila 5-7-3, con el 7 cancelado

    expect((await filasHistorial())[0]).toMatch(/5-7 \(cancelada\)-3.*\$8\.000/);
    expect(indicador('Prendas canceladas')).toBe('1');
  });

  it('una clienta sin compras', async () => {
    clientas.push({ id: 'c-nueva', nombre: 'Ana Rojas', activa: true });
    abrir('/clientas/c-nueva');

    expect(await screen.findByText('Aún no tiene compras.')).toBeInTheDocument();
    expect(indicador('Compras')).toBe('0');
  });

  it('si el historial no carga, lo dice en su sección y no bajo Desactivar', async () => {
    vi.mocked(historialDeClienta).mockRejectedValueOnce(new Error('Sin conexión'));
    abrir('/clientas/c-1');

    const seccion = await screen.findByRole('region', { name: 'Historial por live' });
    expect(await within(seccion).findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.queryByText('Cargando historial…')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Datos de contacto' })).queryByRole('alert')).not.toBeInTheDocument();
  });
});
