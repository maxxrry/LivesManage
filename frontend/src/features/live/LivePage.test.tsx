import { act, render, screen, within } from '@testing-library/react';
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
    expect(lineaDe('Gabriela Peña')).toHaveTextContent('Gabriela Peña6.000 6.000 5.000= $17.000');
    // 17.000 + 10.000 + 13.000 + 8.000 (7 cancelado) + 10.000
    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
  });

  it('"flo 6000 4000" + Enter suma $10.000 a la línea de Florencia y limpia el campo', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6000 4000{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent('Florencia Ruiz: 6.000 4.000 = $10.000');
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $20.000');
    expect(screen.getByTestId('total-live')).toHaveTextContent('$68.000');
    expect(campo).toHaveValue('');
  });

  it('lo que se escribe mientras se guarda la anotación anterior no se borra', async () => {
    let terminar: () => void = () => {};
    vi.mocked(anotar).mockImplementationOnce(async (...args) => {
      await new Promise<void>((listo) => (terminar = listo)); // la API tarda
      const { anotar: real } = await vi.importActual<typeof import('../../services/sesionesService')>('../../services/sesionesService');
      return real(...args);
    });
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6000 4000{Enter}');
    await usuario.clear(campo!);
    await usuario.type(campo!, 'ana 5000');
    terminar();

    expect(await screen.findByRole('status')).toHaveTextContent('Florencia Ruiz');
    expect(campo).toHaveValue('ana 5000');
  });

  it('"flo 6000-" muestra el error y conserva el texto', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6000-{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Falta un precio después del guion');
    expect(campo).toHaveValue('flo 6000-');
    expect(anotar).not.toHaveBeenCalled();
  });

  it('"flo 6 4" en miles da error: no anota ni crea una clienta "flo 6" (D-39)', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6 4{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe los precios completos');
    expect(campo).toHaveValue('flo 6 4');
    expect(anotar).not.toHaveBeenCalled();
    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
  });

  it('acepta precios que no son miles exactos: "flo 3.500" (D-39)', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 3.500{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent('Florencia Ruiz: 3.500 = $3.500');
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $13.500');
  });

  it('tocar dos veces una sugerencia mientras se guarda anota una sola vez (D-39)', async () => {
    let terminar: () => void = () => {};
    vi.mocked(anotar).mockImplementationOnce(async (...args) => {
      await new Promise<void>((listo) => (terminar = listo)); // la API tarda
      const { anotar: real } = await vi.importActual<typeof import('../../services/sesionesService')>('../../services/sesionesService');
      return real(...args);
    });
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'nueva 5000');
    const opcion = screen.getByRole('option', { name: /Nueva clienta "nueva"/ });
    await usuario.click(opcion);
    await usuario.click(opcion);
    terminar();

    expect(await screen.findByRole('status')).toHaveTextContent('nueva: 5.000');
    expect(anotar).toHaveBeenCalledTimes(1);
  });

  it('mientras se guarda una anotación, tocar la sugerencia de la siguiente también la guarda', async () => {
    let terminar: () => void = () => {};
    vi.mocked(anotar).mockImplementationOnce(async (...args) => {
      await new Promise<void>((listo) => (terminar = listo)); // la API tarda
      const { anotar: real } = await vi.importActual<typeof import('../../services/sesionesService')>('../../services/sesionesService');
      return real(...args);
    });
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6000 4000{Enter}');
    await usuario.clear(campo!);
    await usuario.type(campo!, 'nueva 5000');
    await usuario.click(screen.getByRole('option', { name: /Nueva clienta "nueva"/ }));
    terminar();

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(anotar).toHaveBeenCalledTimes(2);
  });

  it('si mientras se guarda ya pasó a otro campo, el campo de anotación no le quita el foco', async () => {
    let terminar: () => void = () => {};
    vi.mocked(anotar).mockImplementationOnce(async (...args) => {
      await new Promise<void>((listo) => (terminar = listo)); // la API tarda
      const { anotar: real } = await vi.importActual<typeof import('../../services/sesionesService')>('../../services/sesionesService');
      return real(...args);
    });
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6000{Enter}');
    const buscar = screen.getByRole('searchbox', { name: 'Buscar en la hoja' });
    await usuario.click(buscar);
    terminar();

    expect(await screen.findByRole('status')).toHaveTextContent('Florencia Ruiz');
    expect(buscar).toHaveFocus();
  });

  it('anotar lo mismo otra vez reinicia el tiempo del aviso', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/lives/s-2'] })} />);
      const campo = await screen.findByRole('combobox', { name: 'Anotación' });

      await usuario.type(campo, 'flo 5000{Enter}');
      await screen.findByRole('status');
      await act(() => vi.advanceTimersByTimeAsync(4000));
      await usuario.type(campo, 'flo 5000{Enter}');
      await vi.waitFor(() => expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $20.000'));

      await act(() => vi.advanceTimersByTimeAsync(2000)); // ya pasó el tiempo del primer aviso
      expect(screen.getByRole('status')).toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(4000));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('si falla la conexión, avisa y conserva el texto (RNF-13)', async () => {
    vi.mocked(anotar).mockRejectedValueOnce(new Error('Sin conexión.'));
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 6000 4000{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó la anotación. Sin conexión.');
    expect(campo).toHaveValue('flo 6000 4000');
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $10.000');
  });

  it('si la anotación se guarda pero la hoja no se puede recargar, no dice que falló', async () => {
    const { usuario, campo } = await abrirLive();
    vi.mocked(obtenerSesion).mockRejectedValueOnce(new Error('Sin conexión.'));

    await usuario.type(campo!, 'flo 6000 4000{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Se guardó el cambio, pero no se pudo actualizar la hoja');
    expect(screen.getByRole('status')).toHaveTextContent('Florencia Ruiz: 6.000 4.000 = $10.000');
    expect(campo).toHaveValue('');
  });

  it('sugiere clientas y tocar "Nueva clienta" crea la línea (D-13)', async () => {
    const { usuario, campo } = await abrirLive();

    await usuario.type(campo!, 'flo 5000');
    const sugerencias = screen.getByRole('listbox', { name: 'Sugerencias de clientas' });
    expect(within(sugerencias).getAllByRole('option')[0]).toHaveTextContent('Florencia Ruiz');
    await usuario.click(within(sugerencias).getByRole('option', { name: /Nueva clienta "flo"/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('flo: 5.000 = $5.000');
    expect(lineaDe('flo')).toHaveTextContent('= $5.000');
  });

  it('Deshacer quita lo recién anotado', async () => {
    const { usuario, campo } = await abrirLive();
    await usuario.type(campo!, 'flo 6000 4000{Enter}');

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
