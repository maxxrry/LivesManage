import { describe, expect, it } from 'vitest';
import type { EstadoSesion, SesionResumen } from '../types/dominio';
import { resumenDeLives } from './sesion';

const live = (id: string, inicio: string, total: number, totalPagado: number, estado: EstadoSesion = 'CERRADA'): SesionResumen => ({
  id,
  inicio,
  estado,
  clientas: 1,
  total,
  totalPagado,
});

const septiembre = { desde: '2026-09-01', hasta: '2026-09-30' };

describe('resumenDeLives', () => {
  it('suma vendido, cobrado y no pagó de los lives Cerrados del período', () => {
    const resumen = resumenDeLives(
      [live('a', '2026-09-10T21:00:00-03:00', 50000, 40000), live('b', '2026-09-24T21:00:00-03:00', 30000, 30000)],
      septiembre,
    );

    expect(resumen).toMatchObject({ vendido: 80000, cobrado: 70000, noPago: 10000 });
    expect(resumen.lives.map((l) => [l.sesion.id, l.cobrado, l.noPago])).toEqual([
      ['b', 30000, 0],
      ['a', 40000, 10000],
    ]);
  });

  it('el live más reciente va primero', () => {
    const resumen = resumenDeLives(
      [live('viejo', '2026-09-02T21:00:00-03:00', 1000, 1000), live('nuevo', '2026-09-20T21:00:00-03:00', 1000, 1000)],
      septiembre,
    );
    expect(resumen.lives.map((l) => l.sesion.id)).toEqual(['nuevo', 'viejo']);
  });

  it('deja fuera los lives Abiertos o En cierre, que todavía pueden cambiar (D-29)', () => {
    const resumen = resumenDeLives(
      [live('abierto', '2026-09-10T21:00:00-03:00', 9000, 0, 'ABIERTA'), live('cierre', '2026-09-11T21:00:00-03:00', 9000, 0, 'EN_CIERRE')],
      septiembre,
    );
    expect(resumen).toEqual({ lives: [], vendido: 0, cobrado: 0, noPago: 0 });
  });

  it('incluye ambos extremos, con el día en hora de Chile', () => {
    const resumen = resumenDeLives(
      [
        live('primero', '2026-09-01T10:00:00-04:00', 1000, 1000),
        // 31/08 a las 23:30 en Chile (horario de invierno, -04:00) ya es 01/09 en UTC: no cuenta.
        live('antes', '2026-08-31T23:30:00-04:00', 8000, 8000),
        // 30/09 a las 23:30 en Chile ya es 01/10 en UTC: igual cuenta.
        live('ultimo', '2026-09-30T23:30:00-03:00', 2000, 2000),
        live('fuera', '2026-10-01T00:30:00-03:00', 4000, 4000),
      ],
      septiembre,
    );
    expect(resumen.lives.map((l) => l.sesion.id)).toEqual(['ultimo', 'primero']);
    expect(resumen.vendido).toBe(3000);
  });
});
