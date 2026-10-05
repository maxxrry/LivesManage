import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas } from '../../app/router';
import { lineas, sesiones, usuarios } from '../../services/mock/datos';

function abrir(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<RouterProvider router={router} />);
  return { usuario: userEvent.setup(), router };
}

/** s-2 En cierre con todo listo salvo las líneas Pendientes, que quedan como estén. */
function cierreConBolsasYEntregas() {
  sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
  for (const l of lineas.filter((l) => l.sesionId === 's-2')) l.bolsaRevisada = true;
}

describe('Finalizar cierre (RF-11)', () => {
  it('muestra el resumen y lo que falta; Cerrar el live queda desactivado', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    const { usuario } = abrir('/lives/s-2/cierre');

    await usuario.click(await screen.findByRole('button', { name: 'Finalizar cierre' }));

    const resumen = screen.getByTestId('resumen-cierre');
    expect(resumen).toHaveTextContent('Total del live$58.000');
    expect(resumen).toHaveTextContent('Pagado$13.000');
    expect(resumen).toHaveTextContent('Retiro1'); // Javiera pagó con Retiro
    expect(screen.getByText(/Revisar 5 bolsas/)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Líneas pendientes' })).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Cerrar el live' })).toBeDisabled();
  });

  it('marcar No pagó a las Pendientes habilita cerrar; al cerrar queda de solo lectura', async () => {
    cierreConBolsasYEntregas();
    const { usuario, router } = abrir('/lives/s-2/cierre');
    await usuario.click(await screen.findByRole('button', { name: 'Finalizar cierre' }));

    for (const nombre of ['Gabriela Peña', 'Florencia Ruiz', 'Camila Rojas', 'Antonia Muñoz']) {
      await usuario.click(await screen.findByRole('button', { name: `No pagó: ${nombre}` }));
    }
    expect(await screen.findByTestId('resumen-cierre')).toHaveTextContent('Sin pagar$45.000');
    await usuario.click(screen.getByRole('button', { name: 'Cerrar el live' }));

    expect(await screen.findByRole('heading', { name: 'Live martes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lives/s-2');
    expect(sesiones.find((s) => s.id === 's-2')!.estado).toBe('CERRADA');
    expect(screen.queryByRole('button', { name: /Cancelar prenda/ })).not.toBeInTheDocument();
  });

  it('Deshacer devuelve una línea No pagó a Pendiente', async () => {
    cierreConBolsasYEntregas();
    lineas.find((l) => l.id === 'l-4')!.estadoPago = 'NO_PAGO';
    const { usuario } = abrir('/lives/s-2/cierre');

    await usuario.click(await screen.findByRole('button', { name: 'Deshacer No pagó: Gabriela Peña' }));

    expect(await screen.findByRole('button', { name: 'Pagado: Gabriela Peña' })).toBeInTheDocument();
    expect(lineas.find((l) => l.id === 'l-4')!.estadoPago).toBe('PENDIENTE');
  });
});

describe('Reabrir cierre (RF-11)', () => {
  it('la administradora reabre un live Cerrado con confirmación y vuelve al cierre', async () => {
    const { usuario, router } = abrir('/lives/s-1');

    await usuario.click(await screen.findByRole('button', { name: 'Reabrir cierre' }));
    await usuario.click(within(screen.getByRole('group', { name: 'Confirmar reapertura' })).getByRole('button', { name: 'Reabrir' }));

    expect(await screen.findByRole('heading', { name: 'Cierre: Live jueves noche' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lives/s-1/cierre');
  });

  it('una vendedora no ve Reabrir cierre', async () => {
    usuarios[0]!.rol = 'VENDEDOR';
    try {
      abrir('/lives/s-1');
      expect(await screen.findByRole('heading', { name: 'Live jueves noche' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reabrir cierre' })).not.toBeInTheDocument();
    } finally {
      usuarios[0]!.rol = 'ADMIN';
    }
  });
});
