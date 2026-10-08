import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';
import { cerrarSesion, tokenActual } from '../../services/usuariosService';

function renderizarEn(ruta: string) {
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} />);
  return userEvent.setup();
}

async function ingresar(usuario: ReturnType<typeof userEvent.setup>, correo: string, contrasena: string) {
  await usuario.type(await screen.findByLabelText('Correo'), correo);
  await usuario.type(screen.getByLabelText('Contraseña'), `${contrasena}{Enter}`);
}

describe('LoginPage (RF-01)', () => {
  it('sin sesión, cualquier pantalla lleva al login', async () => {
    cerrarSesion();
    renderizarEn('/clientas');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('con credenciales válidas entra a Lives', async () => {
    cerrarSesion();
    const usuario = renderizarEn('/login');

    await ingresar(usuario, 'admin@livesmanage.cl', 'admin123');

    expect(await screen.findByRole('heading', { name: 'Lives' })).toBeInTheDocument();
  });

  it.each([
    ['contraseña incorrecta', 'admin@livesmanage.cl', 'mala'],
    ['usuario desactivado', 'antigua@livesmanage.cl', 'antigua123'],
  ])('%s: mensaje genérico y conserva el correo', async (_caso, correo, contrasena) => {
    cerrarSesion();
    const usuario = renderizarEn('/login');

    await ingresar(usuario, correo, contrasena);

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(screen.getByLabelText('Correo')).toHaveValue(correo);
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('con sesión iniciada, /login lleva a Lives', async () => {
    renderizarEn('/login');
    expect(await screen.findByRole('heading', { name: 'Lives' })).toBeInTheDocument();
  });

  it('cerrar sesión descarta el token y vuelve al login', async () => {
    const usuario = renderizarEn('/lives');
    await usuario.click(await screen.findByRole('button', { name: 'Abrir menú' }));
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    expect(within(menu).getByText('Administradora')).toBeInTheDocument();

    await usuario.click(within(menu).getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(tokenActual()).toBeUndefined();
  });
});
