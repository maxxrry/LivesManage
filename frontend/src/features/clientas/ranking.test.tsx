import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rutas } from '../../app/router';
import { rankingClientas } from '../../services/clientasService';
import { lineas, sesiones, usuarios } from '../../services/mock/datos';

// El ranking real, salvo en el test que simula una respuesta lenta.
vi.mock('../../services/clientasService', async (original) => {
  const real = await original<typeof import('../../services/clientasService')>();
  return { ...real, rankingClientas: vi.fn(real.rankingClientas) };
});

// Datos simulados: en el live jueves (24/09, Cerrado) Javiera pagó $12.000 y Valentina $4.000.

function abrir(hoy: string) {
  vi.setSystemTime(new Date(hoy));
  const router = createMemoryRouter(rutas, { initialEntries: ['/ranking'] });
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); // solo la fecha: "hoy" fijo
});

afterEach(() => {
  vi.useRealTimers();
});

const filas = async (nombre: string) =>
  within(await screen.findByRole('list', { name: nombre }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('Ranking (RF-14)', () => {
  it('por defecto: total gastado de los últimos 3 meses', async () => {
    abrir('2026-10-04T12:00:00-03:00');

    expect(await filas('Ranking de clientas')).toEqual([
      expect.stringMatching(/^1Javiera Soto\$12\.0001 compra$/),
      expect.stringMatching(/^2Valentina Soto\$4\.0001 compra$/),
    ]);
    expect(screen.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Total gastado' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-07-04');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-04');
  });

  it('criterio de aceptación: ordena por total gastado, o por compras si se elige', async () => {
    // Valentina compra otra vez: 2 compras por $7.000; Javiera, 1 por $12.000.
    sesiones.push({ id: 's-0', inicio: '2026-09-10T21:00:00-03:00', estado: 'CERRADA' });
    lineas.push({ ...structuredClone(lineas.find((l) => l.id === 'l-2')!), id: 'l-0', sesionId: 's-0', entregaId: undefined });
    lineas.at(-1)!.prendas[0]!.precio = 3000;
    const usuario = abrir('2026-10-04T12:00:00-03:00');

    expect((await filas('Ranking de clientas')).map((f) => f?.slice(1, 15))).toEqual(['Javiera Soto$1', 'Valentina Soto']);
    await usuario.click(screen.getByRole('button', { name: 'Compras' }));
    expect((await filas('Ranking de clientas')).map((f) => f?.slice(1, 15))).toEqual(['Valentina Soto', 'Javiera Soto$1']);
  });

  it('los atajos cambian el período; un período sin compras lo dice', async () => {
    const usuario = abrir('2026-10-04T12:00:00-03:00');
    await filas('Ranking de clientas');

    await usuario.click(screen.getByRole('button', { name: 'Este mes' }));
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01');
    expect(await screen.findByRole('status')).toHaveTextContent('No hay compras entre el 01/10/2026 y el 04/10/2026.');
  });

  it('un período al revés avisa en vez de buscar', async () => {
    const usuario = abrir('2026-10-04T12:00:00-03:00');
    await filas('Ranking de clientas');

    const desde = screen.getByLabelText('Desde');
    await usuario.clear(desde);
    await usuario.type(desde, '2026-10-03');
    await usuario.clear(screen.getByLabelText('Hasta'));
    await usuario.type(screen.getByLabelText('Hasta'), '2026-09-01');

    expect(await screen.findByRole('alert')).toHaveTextContent('"Desde" no puede ser posterior a "Hasta"');
    expect(screen.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('una fecha vacía pide completarla', async () => {
    const usuario = abrir('2026-10-04T12:00:00-03:00');
    await filas('Ranking de clientas');

    await usuario.clear(screen.getByLabelText('Desde'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Completa las fechas "Desde" y "Hasta".');
  });

  it('mientras llega el nuevo orden no muestra la lista anterior', async () => {
    const usuario = abrir('2026-10-04T12:00:00-03:00');
    await filas('Ranking de clientas');

    vi.mocked(rankingClientas).mockReturnValueOnce(new Promise(() => {})); // respuesta que no llega
    await usuario.click(screen.getByRole('button', { name: 'Compras' }));

    expect(screen.queryByRole('list', { name: 'Ranking de clientas' })).not.toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });
});

describe('Inactivas (RF-14)', () => {
  it('criterio de aceptación: sin compras hace 61 días aparece, con su contacto', async () => {
    const usuario = abrir('2026-11-24T12:00:00-03:00');
    await usuario.click(screen.getByRole('button', { name: 'Inactivas' }));

    const [javiera, valentina] = await filas('Clientas inactivas');
    expect(javiera).toMatch(/Javiera Soto61 díasdesde 24\/09\/2026@javisoto\+56 9 1234 5678WhatsApp/);
    expect(valentina).toMatch(/Valentina Soto61 días.*Sin datos de contacto/);

    const lista = screen.getByRole('list', { name: 'Clientas inactivas' });
    expect(within(lista).getByRole('link', { name: '+56 9 1234 5678' })).toHaveAttribute('href', 'tel:+56912345678');
    expect(within(lista).getByRole('link', { name: 'WhatsApp de Javiera Soto' })).toHaveAttribute(
      'href',
      'https://wa.me/56912345678',
    );
  });

  it('a los 60 días todavía no es inactiva', async () => {
    const usuario = abrir('2026-11-23T12:00:00-03:00');
    await usuario.click(screen.getByRole('button', { name: 'Inactivas' }));

    expect(await screen.findByRole('status')).toHaveTextContent('No hay clientas inactivas.');
  });

  it('la administradora cambia los días y la lista se actualiza', async () => {
    const usuario = abrir('2026-11-24T12:00:00-03:00');
    await usuario.click(screen.getByRole('button', { name: 'Inactivas' }));
    await filas('Clientas inactivas');

    const campo = screen.getByLabelText('Días sin comprar');
    await usuario.clear(campo);
    await usuario.type(campo, '61');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('No hay clientas inactivas.');
    expect(screen.getByText(/no compran hace más de/)).toHaveTextContent('61 días');
  });

  it('una vendedora ve el criterio pero no lo cambia', async () => {
    usuarios[0]!.rol = 'VENDEDOR';
    try {
      const usuario = abrir('2026-11-24T12:00:00-03:00');
      await usuario.click(screen.getByRole('button', { name: 'Inactivas' }));
      expect(await screen.findByText(/no compran hace más de/)).toHaveTextContent('60 días');
      expect(screen.queryByLabelText('Días sin comprar')).not.toBeInTheDocument();
    } finally {
      usuarios[0]!.rol = 'ADMIN';
    }
  });
});
