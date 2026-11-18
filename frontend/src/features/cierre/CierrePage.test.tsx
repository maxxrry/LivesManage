import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';
import { sesiones } from '../../services/mock/datos';

function abrir(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<RouterProvider router={router} />);
  return { usuario: userEvent.setup(), router };
}

describe('Terminar live y cierre (RF-09, D-47)', () => {
  it('terminar pide confirmación; al confirmar desaparece la anotación y se abre el cierre', async () => {
    const { usuario, router } = abrir('/lives/s-2');

    await usuario.click(await screen.findByRole('button', { name: 'Terminar live' }));
    const confirmar = screen.getByRole('group', { name: 'Confirmar término' });
    expect(confirmar).toHaveTextContent('¿Terminar el live?');
    await usuario.click(within(confirmar).getByRole('button', { name: 'Terminar' }));

    expect(await screen.findByRole('heading', { name: 'Cierre: Live martes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lives/s-2/cierre');
    expect(screen.queryByRole('combobox', { name: 'Anotación' })).not.toBeInTheDocument();
    expect(sesiones.find((s) => s.id === 's-2')!.estado).toBe('EN_CIERRE');
  });

  it('Cancelar no termina el live', async () => {
    const { usuario } = abrir('/lives/s-2');

    await usuario.click(await screen.findByRole('button', { name: 'Terminar live' }));
    await usuario.click(within(screen.getByRole('group', { name: 'Confirmar término' })).getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('combobox', { name: 'Anotación' })).toBeInTheDocument();
    expect(sesiones.find((s) => s.id === 's-2')!.estado).toBe('ABIERTA');
  });

  it('el cierre ya no pide bolsas ni entrega: se registran en la ficha (D-47)', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    abrir('/lives/s-2/cierre');

    expect(await screen.findByRole('heading', { name: 'Cierre: Live martes' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bolsa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Entrega de/ })).not.toBeInTheDocument();
  });

  it('en el cierre se puede corregir una línea y marcar el pago', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    const { usuario } = abrir('/lives/s-2/cierre');

    await usuario.click((await screen.findAllByRole('button', { name: 'Cancelar prenda de $6.000' }))[0]!);
    expect(await screen.findByText('$52.000')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Pagado: Gabriela Peña' }));
    expect(await screen.findByRole('button', { name: 'Pagado: Gabriela Peña', pressed: true })).toBeInTheDocument();
  });

  it('un live En cierre abre su cierre, y un live Abierto no tiene pantalla de cierre (D-25)', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    const { router } = abrir('/lives/s-2');
    expect(await screen.findByRole('heading', { name: 'Cierre: Live martes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lives/s-2/cierre');
  });

  it('la pantalla de cierre de un live Abierto redirige al live', async () => {
    const { router } = abrir('/lives/s-2/cierre');
    expect(await screen.findByRole('combobox', { name: 'Anotación' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lives/s-2');
  });

  it('en la lista, un live En cierre enlaza a su cierre', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    abrir('/lives');
    const lista = await screen.findByRole('list', { name: 'Lista de lives' });
    expect(within(lista).getAllByRole('link')[0]).toHaveAttribute('href', '/lives/s-2/cierre');
  });
});
