import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../app/router';

function renderizarEn(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<RouterProvider router={router} />);
}

describe('Layout (humo)', () => {
  it('redirige de / a Lives', async () => {
    renderizarEn('/');
    expect(await screen.findByRole('heading', { name: 'Lives' })).toBeInTheDocument();
  });

  it('el menú muestra todas las pantallas y navega', async () => {
    const usuario = userEvent.setup();
    renderizarEn('/lives');

    await usuario.click(await screen.findByRole('button', { name: 'Abrir menú' }));
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    for (const texto of ['Lives', 'Clientas', 'Ranking e inactivas', 'Importar cuaderno', 'Usuarios']) {
      expect(within(menu).getByRole('link', { name: texto })).toBeInTheDocument();
    }

    await usuario.click(within(menu).getByRole('link', { name: 'Clientas' }));
    expect(await screen.findByRole('heading', { name: 'Clientas' })).toBeInTheDocument();
    // El panel de celular se cierra al navegar (en computador el menú queda fijo, D-24).
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveClass('hidden');
  });
});
