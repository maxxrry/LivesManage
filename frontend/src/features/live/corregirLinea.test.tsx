import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';
import { sesiones } from '../../services/mock/datos';

async function abrirLive(id = 's-2') {
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [`/lives/${id}`] })} />);
  await screen.findByRole('list', { name: 'Hoja del live' });
  return userEvent.setup();
}

const lineaDe = (nombre: string) =>
  within(screen.getByRole('list', { name: 'Hoja del live' }))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(nombre))!;

const totalLive = () => screen.getByTestId('total-live');

describe('Corregir línea (RF-06)', () => {
  it('tocar una prenda de $6.000 la cancela y baja la línea y el total; otro toque la restaura', async () => {
    const usuario = await abrirLive();
    const gabriela = lineaDe('Gabriela Peña');

    await usuario.click(within(gabriela).getAllByRole('button', { name: 'Cancelar prenda de $6.000' })[0]!);

    expect(lineaDe('Gabriela Peña')).toHaveTextContent('= $11.000');
    expect(totalLive()).toHaveTextContent('$52.000');
    const cancelada = within(lineaDe('Gabriela Peña')).getByRole('button', { name: 'Restaurar prenda de $6.000' });
    expect(cancelada).toHaveClass('line-through');

    await usuario.click(cancelada);

    expect(lineaDe('Gabriela Peña')).toHaveTextContent('= $17.000');
    expect(totalLive()).toHaveTextContent('$58.000');
  });

  it('cancelar no cambia el orden de la hoja (D-18)', async () => {
    const usuario = await abrirLive();
    const ordenAntes = within(screen.getByRole('list', { name: 'Hoja del live' }))
      .getAllByRole('listitem')
      .map((li) => li.id || li.textContent?.split(/\d/)[0]);

    await usuario.click(within(lineaDe('Gabriela Peña')).getAllByRole('button', { name: /Cancelar prenda/ })[0]!);

    const ordenDespues = within(screen.getByRole('list', { name: 'Hoja del live' }))
      .getAllByRole('listitem')
      .map((li) => li.id || li.textContent?.split(/\d/)[0]);
    expect(ordenDespues).toEqual(ordenAntes);
  });

  it('cambia la clienta de una línea a otra sin línea en el live', async () => {
    const usuario = await abrirLive();

    await usuario.click(screen.getByRole('button', { name: 'Cambiar clienta de Gabriela Peña' }));
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar la clienta correcta' }), 'valen');
    await usuario.click(screen.getByRole('option', { name: 'Valentina Soto' }));

    expect(await screen.findByRole('button', { name: 'Cambiar clienta de Valentina Soto' })).toBeInTheDocument();
    expect(lineaDe('Valentina Soto')).toHaveTextContent('6-6-5= $17.000');
    expect(screen.queryByRole('button', { name: 'Cambiar clienta de Gabriela Peña' })).not.toBeInTheDocument();
  });

  it('si la clienta ya tiene línea, pide confirmación y une ambas (D-19)', async () => {
    const usuario = await abrirLive();

    await usuario.click(screen.getByRole('button', { name: 'Cambiar clienta de Gabriela Peña' }));
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar la clienta correcta' }), 'flo{Enter}');

    expect(screen.getByText('Florencia Ruiz ya tiene línea en este live. ¿Unirlas?')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Unir' }));

    expect(await screen.findByText('= $27.000')).toBeInTheDocument();
    expect(lineaDe('Florencia Ruiz')).toHaveTextContent('6-4-6-6-5= $27.000');
    expect(totalLive()).toHaveTextContent('$58.000');
    expect(within(screen.getByRole('list', { name: 'Hoja del live' })).getAllByRole('listitem')).toHaveLength(4);
  });

  it('Cancelar en la confirmación no une nada', async () => {
    const usuario = await abrirLive();

    await usuario.click(screen.getByRole('button', { name: 'Cambiar clienta de Gabriela Peña' }));
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar la clienta correcta' }), 'flo{Enter}');
    await usuario.click(within(screen.getByRole('group', { name: 'Confirmar unión' })).getByRole('button', { name: 'Cancelar' }));

    expect(within(screen.getByRole('list', { name: 'Hoja del live' })).getAllByRole('listitem')).toHaveLength(5);
    expect(lineaDe('Gabriela Peña')).toHaveTextContent('= $17.000');
  });

  it('En cierre se puede corregir, pero no anotar', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    const usuario = await abrirLive();

    expect(screen.queryByRole('combobox', { name: 'Anotación' })).not.toBeInTheDocument();
    await usuario.click(within(lineaDe('Gabriela Peña')).getAllByRole('button', { name: /Cancelar prenda/ })[0]!);
    expect(totalLive()).toHaveTextContent('$52.000');
  });

  it('en un live Cerrado las prendas no se pueden tocar', async () => {
    await abrirLive('s-1');
    expect(within(screen.getByRole('list', { name: 'Hoja del live' })).queryAllByRole('button')).toHaveLength(0);
  });
});
