import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';
import { clientas, entregas, lineas, sesiones } from '../../services/mock/datos';

// s-2 En cierre: Javiera (l-6) tiene Retiro (e-2) y dirección en su ficha; Gabriela (l-4) no tiene dirección.
beforeEach(() => {
  sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
});

async function abrirCierre() {
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/lives/s-2/cierre'] })} />);
  const usuario = userEvent.setup();
  await screen.findByRole('heading', { name: 'Cierre: Live martes' });
  return usuario;
}

const entregaDe = (nombre: string) => screen.getByRole('group', { name: `Entrega de ${nombre}` });
const entregaDeLinea = (lineaId: string) => entregas.find((e) => e.id === lineas.find((l) => l.id === lineaId)!.entregaId);

describe('Forma de entrega en el cierre (RF-10)', () => {
  it('muestra la forma registrada y Retiro se elige con un toque', async () => {
    const usuario = await abrirCierre();

    expect(within(entregaDe('Javiera Soto')).getByRole('button', { name: 'Retiro' })).toHaveAttribute('aria-pressed', 'true');

    await usuario.click(within(entregaDe('Florencia Ruiz')).getByRole('button', { name: 'Feria' }));

    expect(await within(entregaDe('Florencia Ruiz')).findByRole('button', { name: 'Feria', pressed: true })).toBeInTheDocument();
    expect(entregaDeLinea('l-5')?.tipo).toBe('FERIA');
  });

  it('Despacho ofrece confirmar la dirección de la ficha', async () => {
    const usuario = await abrirCierre();

    await usuario.click(within(entregaDe('Javiera Soto')).getByRole('button', { name: 'Despacho' }));
    await usuario.click(within(entregaDe('Javiera Soto')).getByRole('button', { name: /Usar la de su ficha/ }));

    expect(await within(entregaDe('Javiera Soto')).findByText(/Los Aromos 1234, depto 52, Maipú/)).toBeInTheDocument();
    expect(entregaDeLinea('l-6')).toMatchObject({ tipo: 'DESPACHO', direccion: { comuna: 'Maipú' } });
  });

  it('sin dirección en la ficha ni despachos que agrupar abre el formulario; la dirección queda en la ficha', async () => {
    const usuario = await abrirCierre();
    const grupo = entregaDe('Gabriela Peña');

    await usuario.click(within(grupo).getByRole('button', { name: 'Despacho' }));
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Calle y número' }), 'Irarrázaval 3000');
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Comuna' }), 'Ñuñoa');
    await usuario.click(within(grupo).getByRole('button', { name: 'Guardar' }));

    expect(await within(entregaDe('Gabriela Peña')).findByText(/Irarrázaval 3000, Ñuñoa/)).toBeInTheDocument();
    expect(clientas.find((c) => c.id === 'c-1')?.direccion).toMatchObject({ calle: 'Irarrázaval 3000', comuna: 'Ñuñoa', region: 'Metropolitana' });
  });

  it('una clienta se agrupa con el despacho de otra y comparten dirección', async () => {
    const usuario = await abrirCierre();
    await usuario.click(within(entregaDe('Javiera Soto')).getByRole('button', { name: 'Despacho' }));
    await usuario.click(within(entregaDe('Javiera Soto')).getByRole('button', { name: /Usar la de su ficha/ }));
    await within(entregaDe('Javiera Soto')).findByText(/Maipú/);

    await usuario.click(within(entregaDe('Gabriela Peña')).getByRole('button', { name: 'Despacho' }));
    await usuario.click(within(entregaDe('Gabriela Peña')).getByRole('button', { name: /Enviar junto con Javiera Soto/ }));

    expect(await within(entregaDe('Gabriela Peña')).findByText(/junto con Javiera Soto/)).toBeInTheDocument();
    expect(within(entregaDe('Javiera Soto')).getByText(/junto con Gabriela Peña/)).toBeInTheDocument();
    expect(entregaDeLinea('l-4')?.id).toBe(entregaDeLinea('l-6')?.id);
  });

  it('un error del servicio se muestra junto a la entrega y conserva lo escrito', async () => {
    const usuario = await abrirCierre();
    const grupo = entregaDe('Gabriela Peña');

    await usuario.click(within(grupo).getByRole('button', { name: 'Despacho' }));
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Calle y número' }), 'Irarrázaval 3000');
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Comuna' }), '   ');
    await usuario.click(within(grupo).getByRole('button', { name: 'Guardar' }));

    expect(await within(grupo).findByRole('alert')).toHaveTextContent('Falta la comuna');
    expect(within(grupo).getByRole('textbox', { name: 'Calle y número' })).toHaveValue('Irarrázaval 3000');
    expect(entregaDeLinea('l-4')).toBeUndefined();
  });
});
