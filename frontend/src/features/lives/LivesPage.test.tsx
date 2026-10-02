import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';
import { sesiones } from '../../services/mock/datos';

function abrirLista() {
  const router = createMemoryRouter(rutas, { initialEntries: ['/lives'] });
  render(<RouterProvider router={router} />);
  return { usuario: userEvent.setup(), router };
}

const tarjeta = async (nombre: string) => {
  const lista = await screen.findByRole('list', { name: 'Lista de lives' });
  return within(lista)
    .getAllByRole('link')
    .find((a) => a.textContent?.startsWith(nombre));
};

describe('Pantalla Lives (RF-04)', () => {
  it('muestra cada live con fecha, estado, clientas, total y pagado, del más reciente al más antiguo', async () => {
    abrirLista();

    const martes = await tarjeta('Live martes');
    expect(martes).toHaveTextContent('Abierta');
    expect(martes).toHaveTextContent('29/09/2026 20:30');
    expect(martes).toHaveTextContent('5 clientas');
    expect(martes).toHaveTextContent('Total $58.000');
    expect(martes).toHaveTextContent('Pagado $13.000');

    const jueves = await tarjeta('Live jueves noche');
    expect(jueves).toHaveTextContent('Cerrada');
    expect(jueves).toHaveTextContent('3 clientas');
    expect(jueves).toHaveTextContent('Total $25.000');
    expect(jueves).toHaveTextContent('Pagado $16.000');

    const enlaces = within(screen.getByRole('list', { name: 'Lista de lives' })).getAllByRole('link');
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/lives/s-2', '/lives/s-1']);
  });

  it('con un live Abierto ofrece continuar en él y no permite abrir otro', async () => {
    abrirLista();

    expect(await screen.findByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/lives/s-2');
    expect(screen.queryByRole('button', { name: 'Abrir live' })).not.toBeInTheDocument();
  });

  it('sin live Abierto, abre uno nuevo con nombre y entra a su pantalla', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    const { usuario, router } = abrirLista();

    await usuario.click(await screen.findByRole('button', { name: 'Abrir live' }));
    await usuario.type(screen.getByLabelText('Nombre del live (opcional)'), 'Live viernes');
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(await screen.findByRole('heading', { name: 'Live viernes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/lives\/s-\d+$/);
    expect(screen.getByRole('combobox', { name: 'Anotación' })).toBeInTheDocument();
  });

  it('un live sin nombre se muestra como "Live del dd/mm"', async () => {
    delete sesiones.find((s) => s.id === 's-1')!.nombre;
    abrirLista();

    expect(await tarjeta('Live del 24/09')).toBeDefined();
  });

  it('Cancelar cierra el formulario sin abrir nada', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'CERRADA';
    const { usuario } = abrirLista();

    await usuario.click(await screen.findByRole('button', { name: 'Abrir live' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Abrir live' })).toBeInTheDocument();
    expect(sesiones.filter((s) => s.estado === 'ABIERTA')).toHaveLength(0);
  });
});
