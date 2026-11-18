import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rutas } from '../../app/router';
import { clientas, entregas, lineas } from '../../services/mock/datos';
import { historialDeClienta } from '../../services/sesionesService';

// El historial real, salvo en el test que simula una falla al recargar.
vi.mock('../../services/sesionesService', async (original) => {
  const real = await original<typeof import('../../services/sesionesService')>();
  return { ...real, historialDeClienta: vi.fn(real.historialDeClienta) };
});

// s-1 (24/09/2026) está Cerrado: Javiera (c-3, l-1, con dirección en su ficha) y Gabriela (c-1, l-3, sin dirección),
// cada una con 1 bolsa Entregada.
// s-2 (29/09/2026) está Abierto.
async function abrirFicha(clientaId: string) {
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [`/clientas/${clientaId}`] })} />);
  const usuario = userEvent.setup();
  const lista = await screen.findByRole('list', { name: 'Historial por live' }); // celular; la tabla repite lo mismo
  return { usuario, lista };
}

const delLiveCerrado = (lista: HTMLElement) => within(lista).getByRole('group', { name: 'Bolsas y entrega del live 24/09/2026' });
const entregaDeLinea = (lineaId: string) => entregas.find((e) => e.id === lineas.find((l) => l.id === lineaId)!.entregaId);

describe('Bolsas y entrega en la ficha (D-47)', () => {
  it('con el live Cerrado se suman bolsas y se vuelven a dejar En bodega', async () => {
    const { usuario, lista } = await abrirFicha('c-3');
    expect(within(delLiveCerrado(lista)).getByRole('button', { name: 'Entregada' })).toHaveAttribute('aria-pressed', 'true');

    await usuario.click(within(delLiveCerrado(lista)).getByRole('button', { name: 'Agregar una bolsa' }));
    expect(await within(delLiveCerrado(lista)).findByText('2')).toBeInTheDocument();
    await usuario.click(within(delLiveCerrado(lista)).getByRole('button', { name: 'En bodega' }));

    expect(await within(delLiveCerrado(lista)).findByRole('button', { name: 'En bodega', pressed: true })).toBeInTheDocument();
    expect(lineas.find((l) => l.id === 'l-1')).toMatchObject({ bolsas: 2, entregada: false });
  });

  it('sin bolsas, el estado no se puede elegir', async () => {
    lineas.find((l) => l.id === 'l-3')!.bolsas = 0;
    const { lista } = await abrirFicha('c-1');

    expect(within(delLiveCerrado(lista)).getByRole('button', { name: 'Entregada' })).toBeDisabled();
    expect(within(delLiveCerrado(lista)).getByRole('button', { name: 'Quitar una bolsa' })).toBeDisabled();
  });

  it('un live Abierto no muestra bolsas ni entrega', async () => {
    const { lista } = await abrirFicha('c-3');

    expect(within(lista).queryByRole('group', { name: 'Bolsas y entrega del live 29/09/2026' })).not.toBeInTheDocument();
  });

  it('Despacho usa la dirección de la ficha', async () => {
    const { usuario, lista } = await abrirFicha('c-3');

    await usuario.click(within(delLiveCerrado(lista)).getByRole('button', { name: 'Despacho' }));
    await usuario.click(within(delLiveCerrado(lista)).getByRole('button', { name: /Usar la de su ficha/ }));

    expect(await within(delLiveCerrado(lista)).findByText(/Los Aromos 1234, depto 52, Maipú/)).toBeInTheDocument();
    expect(entregaDeLinea('l-1')).toMatchObject({ tipo: 'DESPACHO', direccion: { comuna: 'Maipú' } });
  });

  it('sin dirección en la ficha abre el formulario, y la dirección queda en la ficha', async () => {
    const { usuario, lista } = await abrirFicha('c-1');
    const grupo = delLiveCerrado(lista);

    await usuario.click(within(grupo).getByRole('button', { name: 'Despacho' }));
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Calle y número' }), 'Irarrázaval 3000');
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Comuna' }), 'Ñuñoa');
    await usuario.click(within(grupo).getByRole('button', { name: 'Guardar' }));

    expect(await within(delLiveCerrado(lista)).findByText(/Irarrázaval 3000, Ñuñoa/)).toBeInTheDocument();
    expect(clientas.find((c) => c.id === 'c-1')?.direccion).toMatchObject({ calle: 'Irarrázaval 3000', comuna: 'Ñuñoa' });
    // También se actualizan los datos de la ficha (la entrega aparece en la lista y en la tabla, y la ficha la muestra).
    expect(screen.getAllByText(/Irarrázaval 3000, Ñuñoa/).length).toBeGreaterThanOrEqual(3);
  });

  it('si se guardó pero falla la recarga, no dice que no se guardó', async () => {
    const { usuario, lista } = await abrirFicha('c-3');
    vi.mocked(historialDeClienta).mockRejectedValueOnce(new Error('No se pudo conectar con el servidor.'));

    await usuario.click(within(delLiveCerrado(lista)).getByRole('button', { name: 'Agregar una bolsa' }));

    expect(await within(delLiveCerrado(lista)).findByRole('alert')).toHaveTextContent('Se guardó, pero no se pudo actualizar');
    expect(lineas.find((l) => l.id === 'l-1')!.bolsas).toBe(2);
  });

  it('un error se muestra junto a la entrega y conserva lo escrito', async () => {
    const { usuario, lista } = await abrirFicha('c-1');
    const grupo = delLiveCerrado(lista);

    await usuario.click(within(grupo).getByRole('button', { name: 'Despacho' }));
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Calle y número' }), 'Irarrázaval 3000');
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Comuna' }), '   ');
    await usuario.click(within(grupo).getByRole('button', { name: 'Guardar' }));

    expect(await within(grupo).findByRole('alert')).toHaveTextContent('Falta la comuna');
    expect(within(grupo).getByRole('textbox', { name: 'Calle y número' })).toHaveValue('Irarrázaval 3000');
  });
});
