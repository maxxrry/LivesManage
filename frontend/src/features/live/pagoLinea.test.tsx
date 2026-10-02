import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';

async function abrirLive(id = 's-2') {
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [`/lives/${id}`] })} />);
  await screen.findByRole('list', { name: 'Hoja del live' });
  return userEvent.setup();
}

const lineaDe = (nombre: string) =>
  within(screen.getByRole('list', { name: 'Hoja del live' }))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(nombre))!;

describe('Marcar estado de pago (RF-07)', () => {
  it('marcar Pagada la línea de $17.000 la destaca y sube el total pagado en $17.000', async () => {
    const usuario = await abrirLive();
    const boton = screen.getByRole('button', { name: 'Pagado: Gabriela Peña' });
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('total-pagado')).toHaveTextContent('$13.000');

    await usuario.click(boton);

    expect(await screen.findByRole('button', { name: 'Pagado: Gabriela Peña', pressed: true })).toBeInTheDocument();
    expect(lineaDe('Gabriela Peña')).toHaveClass('bg-marca-50');
    expect(screen.getByTestId('total-pagado')).toHaveTextContent('$30.000');
    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
  });

  it('otro toque la vuelve a Pendiente', async () => {
    const usuario = await abrirLive();
    await usuario.click(screen.getByRole('button', { name: 'Pagado: Gabriela Peña' }));
    await usuario.click(await screen.findByRole('button', { name: 'Pagado: Gabriela Peña', pressed: true }));

    expect(await screen.findByRole('button', { name: 'Pagado: Gabriela Peña', pressed: false })).toBeInTheDocument();
    expect(lineaDe('Gabriela Peña')).not.toHaveClass('bg-marca-50');
    expect(screen.getByTestId('total-pagado')).toHaveTextContent('$13.000');
  });

  it('anotar a una clienta que ya pagó la vuelve a Pendiente (D-20)', async () => {
    const usuario = await abrirLive();
    expect(screen.getByRole('button', { name: 'Pagado: Javiera Soto' })).toHaveAttribute('aria-pressed', 'true');

    await usuario.type(screen.getByRole('combobox', { name: 'Anotación' }), 'javi 5{Enter}');

    expect(await screen.findByRole('button', { name: 'Pagado: Javiera Soto', pressed: false })).toBeInTheDocument();
    expect(screen.getByTestId('total-pagado')).toHaveTextContent('$0');
  });

  it('cambiar el pago de la línea recién anotada cierra el aviso de Deshacer (D-22)', async () => {
    const usuario = await abrirLive();
    await usuario.type(screen.getByRole('combobox', { name: 'Anotación' }), 'flo 6-4{Enter}');
    expect(await screen.findByRole('status')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Pagado: Florencia Ruiz' }));

    expect(await screen.findByRole('button', { name: 'Pagado: Florencia Ruiz', pressed: true })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('cambiar el pago de otra línea mantiene el aviso', async () => {
    const usuario = await abrirLive();
    await usuario.type(screen.getByRole('combobox', { name: 'Anotación' }), 'flo 6-4{Enter}');
    expect(await screen.findByRole('status')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Pagado: Gabriela Peña' }));

    expect(await screen.findByRole('button', { name: 'Pagado: Gabriela Peña', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('en un live Cerrado muestra el estado como texto, sin botón', async () => {
    await abrirLive('s-1');
    expect(lineaDe('Javiera Soto')).toHaveTextContent('Pagado');
    expect(lineaDe('Gabriela Peña')).toHaveTextContent('No pagó');
    expect(screen.queryByRole('button', { name: /^Pagado:/ })).not.toBeInTheDocument();
  });
});
