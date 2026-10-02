import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rutas } from '../../app/router';
import { anotar, obtenerSesion } from '../../services/sesionesService';

// Mock parcial: anotar sigue usando la implementación real, salvo en el test
// que fuerza un error de conexión con mockRejectedValueOnce.
vi.mock('../../services/sesionesService', async (original) => {
  const real = await original<typeof import('../../services/sesionesService')>();
  return { ...real, anotar: vi.fn(real.anotar), obtenerSesion: vi.fn(real.obtenerSesion) };
});

async function abrirLive(id = 's-2') {
  const usuario = userEvent.setup();
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [`/lives/${id}`] })} />);
  const campo = id === 's-2' ? await screen.findByRole('combobox', { name: 'Anotación' }) : null;
  return { usuario, campo };
}

const lineaDe = (nombre: string) =>
  within(screen.getByRole('list', { name: 'Hoja del live' }))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(nombre));

describe('Pantalla de live (RF-05)', () => {
  it('muestra la hoja en formato cuaderno y el total del live', async () => {
    await abrirLive();
    expect(lineaDe('Gabriela Peña')).toHaveTextContent('Gabriela Peña6-6-5= $17.000');
    // 17.000 + 10.000 + 13.000 + 8.000 (7 cancelado) + 10.000
    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
  });

  it('"flo 6-4" + Enter suma $10.000 a la línea de Florencia y limpia el campo', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6-4{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent('Florencia Ruiz: 6-4 = $10.000');
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $20.000');
    expect(screen.getByTestId('total-live')).toHaveTextContent('$68.000');
    expect(campo).toHaveValue('');
  });

  it('"flo 6-" muestra el error y conserva el texto', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6-{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Falta un precio después del guion');
    expect(campo).toHaveValue('flo 6-');
    expect(anotar).not.toHaveBeenCalled();
  });

  it('si falla la conexión, avisa y conserva el texto (RNF-13)', async () => {
    vi.mocked(anotar).mockRejectedValueOnce(new Error('Sin conexión.'));
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6-4{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó la anotación. Sin conexión.');
    expect(campo).toHaveValue('flo 6-4');
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $10.000');
  });

  it('si la anotación se guarda pero la hoja no se puede recargar, no dice que falló', async () => {
    const { usuario, campo } = await abrirLive();
    vi.mocked(obtenerSesion).mockRejectedValueOnce(new Error('Sin conexión.'));

    await usuario.type(campo!, 'flo 6-4{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Se guardó el cambio, pero no se pudo actualizar la hoja');
    expect(screen.getByRole('status')).toHaveTextContent('Florencia Ruiz: 6-4 = $10.000');
    expect(campo).toHaveValue('');
  });

  it('sugiere clientas y tocar "Nueva clienta" crea la línea (D-13)', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 5');
    const sugerencias = screen.getByRole('listbox', { name: 'Sugerencias de clientas' });
    expect(within(sugerencias).getAllByRole('option')[0]).toHaveTextContent('Florencia Ruiz');
    await usuario.click(within(sugerencias).getByRole('option', { name: /Nueva clienta "flo"/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('flo: 5 = $5.000');
    expect(lineaDe('flo')).toHaveTextContent('= $5.000');
  });

  it('Deshacer quita lo recién anotado', async () => {
    const { usuario, campo } = await abrirLive();
    await usuario.type(campo!, 'flo 6-4{Enter}');

    await usuario.click(await screen.findByRole('button', { name: 'Deshacer' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $10.000');
    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
  });

  it('en un live Cerrado no aparece el campo de anotación', async () => {
    await abrirLive('s-1');
    expect(await screen.findByText(/ya no se puede anotar/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
