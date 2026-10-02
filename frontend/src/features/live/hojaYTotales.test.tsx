import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';

async function abrirLive() {
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/lives/s-2'] })} />);
  await screen.findByRole('list', { name: 'Hoja del live' });
  return userEvent.setup();
}

const lineasVisibles = () => within(screen.getByRole('list', { name: 'Hoja del live' })).getAllByRole('listitem');
const clp = (texto: string) => Number(texto.replace(/\D/g, ''));
/** Suma los "= $X" de las líneas que se ven en la hoja. */
const sumaVisible = () =>
  lineasVisibles().reduce((suma, li) => suma + clp(li.textContent!.match(/= (\$[\d.]+)/)![1]!), 0);

describe('Hoja y totales del live (RF-08)', () => {
  it('muestra total, pagado, pendiente y número de clientas del live', async () => {
    await abrirLive();
    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
    expect(screen.getByTestId('total-pagado')).toHaveTextContent('$13.000');
    expect(screen.getByTestId('total-pendiente')).toHaveTextContent('$45.000');
    expect(screen.getByTestId('total-clientas')).toHaveTextContent('5');
  });

  it('tras anotar, cancelar y pagar, el total del live es igual a la suma de las líneas visibles', async () => {
    const usuario = await abrirLive();
    expect(sumaVisible()).toBe(clp(screen.getByTestId('total-live').textContent!));

    await usuario.type(screen.getByRole('combobox', { name: 'Anotación' }), 'ana 5{Enter}');
    await screen.findByText('ana');
    expect(screen.getByTestId('total-clientas')).toHaveTextContent('6');
    expect(sumaVisible()).toBe(clp(screen.getByTestId('total-live').textContent!));

    await usuario.click(within(lineasVisibles().find((li) => li.textContent?.startsWith('Gabriela'))!).getAllByRole('button', { name: /Cancelar prenda/ })[0]!);
    await screen.findByText('$57.000');
    expect(sumaVisible()).toBe(57000);

    await usuario.click(screen.getByRole('button', { name: 'Pagado: Gabriela Peña' }));
    expect(await screen.findByTestId('total-pagado')).toHaveTextContent('$24.000');
    expect(screen.getByTestId('total-pendiente')).toHaveTextContent('$33.000');
    expect(sumaVisible()).toBe(clp(screen.getByTestId('total-live').textContent!));
  });

  it('la búsqueda filtra por nombre sin tildes ni mayúsculas, y los totales siguen siendo del live', async () => {
    const usuario = await abrirLive();

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar en la hoja' }), 'PENA');

    expect(lineasVisibles()).toHaveLength(1);
    expect(lineasVisibles()[0]).toHaveTextContent('Gabriela Peña');
    expect(screen.getByText('Mostrando 1 de 5 clientas')).toBeInTheDocument();
    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
  });

  it('busca también por apellido o parte de una palabra', async () => {
    const usuario = await abrirLive();
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar en la hoja' }), 'soto');
    expect(lineasVisibles().map((li) => li.textContent?.split(/\d/)[0])).toEqual(['Javiera Soto']);
  });

  it('al anotar se borra la búsqueda, para que la línea anotada se vea', async () => {
    const usuario = await abrirLive();
    const buscar = screen.getByRole('searchbox', { name: 'Buscar en la hoja' });
    await usuario.type(buscar, 'flo');

    await usuario.type(screen.getByRole('combobox', { name: 'Anotación' }), 'ana 5{Enter}');

    expect(await screen.findByText('ana')).toBeInTheDocument();
    expect(buscar).toHaveValue('');
    expect(lineasVisibles()).toHaveLength(6);
  });

  it('sin coincidencias lo indica, y al borrar vuelven todas las líneas', async () => {
    const usuario = await abrirLive();
    const buscar = screen.getByRole('searchbox', { name: 'Buscar en la hoja' });

    await usuario.type(buscar, 'zzz');
    expect(screen.getByText('Ninguna clienta coincide con "zzz".')).toBeInTheDocument();

    await usuario.clear(buscar);
    expect(lineasVisibles()).toHaveLength(5);
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });
});
