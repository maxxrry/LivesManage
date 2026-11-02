import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rutas } from '../../app/router';
import { sesiones } from '../../services/mock/datos';
import { anotar } from '../../services/sesionesService';

vi.mock('../../services/sesionesService', async (original) => {
  const real = await original<typeof import('../../services/sesionesService')>();
  return { ...real, anotar: vi.fn(real.anotar) };
});

async function abrir(ruta = '/lives/s-2') {
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} />);
  await screen.findByRole('list', { name: 'Hoja del live' });
  return userEvent.setup();
}

const lineaDe = (nombre: string) =>
  within(screen.getByRole('list', { name: 'Hoja del live' }))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(nombre))!;

const lapiz = (nombre: string) => screen.getByRole('button', { name: `Editar línea de ${nombre}` });
const campoPrecios = () => screen.getByRole('textbox', { name: 'Agregar prendas' });

/** La API tarda hasta que la prueba decide cómo termina. */
function anotarLento() {
  const control = { terminar: () => {}, fallar: () => {} };
  vi.mocked(anotar).mockImplementationOnce(async (...args) => {
    await new Promise<void>((listo, mal) => {
      control.terminar = listo;
      control.fallar = () => mal(new Error('Sin conexión.'));
    });
    const { anotar: real } = await vi.importActual<typeof import('../../services/sesionesService')>('../../services/sesionesService');
    return real(...args);
  });
  return control;
}

describe('Agregar prendas desde el lápiz (RF-05, D-41)', () => {
  it('el lápiz abre el panel con el cursor en los precios', async () => {
    const usuario = await abrir();

    await usuario.click(lapiz('Florencia Ruiz'));

    expect(campoPrecios()).toHaveFocus();
    expect(lapiz('Florencia Ruiz')).toHaveAttribute('aria-expanded', 'true');
  });

  it('agrega las prendas a esa línea sin escribir el nombre y cierra el panel', async () => {
    const usuario = await abrir();

    await usuario.click(lapiz('Florencia Ruiz'));
    await usuario.type(campoPrecios(), '6000 4000{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent('Florencia Ruiz: 6.000 4.000 = $10.000');
    expect(anotar).toHaveBeenCalledWith('s-2', { clientaId: 'c-2' }, [6000, 4000]);
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $20.000');
    expect(screen.getByTestId('total-live')).toHaveTextContent('$68.000');
    expect(screen.queryByRole('textbox', { name: 'Agregar prendas' })).not.toBeInTheDocument();
    expect(lapiz('Florencia Ruiz')).toHaveFocus();
  });

  it('Deshacer quita lo agregado', async () => {
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));
    await usuario.type(campoPrecios(), '5000{Enter}');

    await usuario.click(await screen.findByRole('button', { name: 'Deshacer' }));

    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $10.000');
  });

  it('precios incompletos: muestra el error, conserva el texto y no anota', async () => {
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));

    await usuario.type(campoPrecios(), '6 4{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe los precios completos');
    expect(campoPrecios()).toHaveValue('6 4');
    expect(campoPrecios()).toHaveAttribute('aria-invalid', 'true');
    expect(anotar).not.toHaveBeenCalled();
  });

  it('si falla la conexión, avisa y conserva el texto (RNF-13)', async () => {
    vi.mocked(anotar).mockRejectedValueOnce(new Error('Sin conexión.'));
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));

    await usuario.type(campoPrecios(), '6000{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó la anotación. Sin conexión.');
    expect(campoPrecios()).toHaveValue('6000');
    expect(campoPrecios()).toHaveFocus();
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('= $10.000');
  });

  it('agregar a una línea Pagada la vuelve a Pendiente (D-20)', async () => {
    const usuario = await abrir();
    expect(screen.getByRole('button', { name: 'Pagado: Javiera Soto' })).toHaveAttribute('aria-pressed', 'true');

    await usuario.click(lapiz('Javiera Soto'));
    await usuario.type(campoPrecios(), '5000{Enter}');

    expect(await screen.findByRole('button', { name: 'Pagado: Javiera Soto', pressed: false })).toBeInTheDocument();
  });

  it('Escape cierra el panel y devuelve el foco al lápiz', async () => {
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));

    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('textbox', { name: 'Agregar prendas' })).not.toBeInTheDocument();
    expect(lapiz('Florencia Ruiz')).toHaveFocus();
  });

  it('desde el panel se puede cambiar la clienta (RF-06)', async () => {
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));

    await usuario.click(screen.getByRole('button', { name: 'Cambiar clienta' }));

    expect(screen.getByRole('combobox', { name: 'Buscar la clienta correcta' })).toHaveFocus();
    expect(screen.queryByRole('textbox', { name: 'Agregar prendas' })).not.toBeInTheDocument();
  });

  it('mientras se guarda el panel no se cierra, para que un fallo se vea (RNF-13)', async () => {
    const control = anotarLento();
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));
    await usuario.type(campoPrecios(), '6000{Enter}');

    await usuario.keyboard('{Escape}');
    await usuario.click(lapiz('Florencia Ruiz'));
    await usuario.click(lapiz('Gabriela Peña'));
    expect(screen.getByRole('button', { name: 'Cambiar clienta' })).toBeDisabled();
    control.fallar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó la anotación. Sin conexión.');
    expect(campoPrecios()).toHaveValue('6000');
  });

  it('si mientras se guarda ya pasó a otro campo, no le quita el foco', async () => {
    const control = anotarLento();
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));
    await usuario.type(campoPrecios(), '6000{Enter}');

    const anotacion = screen.getByRole('combobox', { name: 'Anotación' });
    await usuario.click(anotacion);
    control.terminar();

    expect(await screen.findByRole('status')).toHaveTextContent('Florencia Ruiz');
    expect(anotacion).toHaveFocus();
  });

  it('buscar en la hoja cierra el panel, y no vuelve a abrirse solo', async () => {
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));

    const buscar = screen.getByRole('searchbox', { name: 'Buscar en la hoja' });
    await usuario.type(buscar, 'gab');
    await usuario.clear(buscar);

    expect(screen.queryByRole('textbox', { name: 'Agregar prendas' })).not.toBeInTheDocument();
    expect(buscar).toHaveFocus();
  });

  it('Cancelar en Cambiar clienta devuelve el foco al lápiz', async () => {
    const usuario = await abrir();
    await usuario.click(lapiz('Florencia Ruiz'));
    await usuario.click(screen.getByRole('button', { name: 'Cambiar clienta' }));

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('combobox', { name: 'Buscar la clienta correcta' })).not.toBeInTheDocument();
    expect(lapiz('Florencia Ruiz')).toHaveFocus();
  });

  it('en el cierre el lápiz abre directo Cambiar clienta: ya no se anota (RF-09)', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    const usuario = await abrir('/lives/s-2/cierre');

    await usuario.click(screen.getByRole('button', { name: 'Cambiar clienta de Florencia Ruiz' }));

    expect(screen.getByRole('combobox', { name: 'Buscar la clienta correcta' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Agregar prendas' })).not.toBeInTheDocument();
  });
});
