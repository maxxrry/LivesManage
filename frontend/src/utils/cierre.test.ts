import { describe, expect, it } from 'vitest';
import type { Linea } from '../types/dominio';
import { revisarCierre } from './cierre';

function linea(id: string, cambios: Partial<Linea> = {}): Linea {
  return {
    id,
    sesionId: 's',
    clientaId: `c-${id}`,
    clientaNombre: `Clienta ${id}`,
    prendas: [{ id: `p-${id}`, precio: 10000, estado: 'VIGENTE' }],
    estadoPago: 'PAGADO',
    bolsas: 0,
    entregada: false,
    actualizada: '2026-10-03T12:00:00-03:00',
    ...cambios,
  };
}

describe('revisarCierre (RF-11, D-47)', () => {
  it('está listo sin Pendientes, aunque no haya bolsas ni entregas (D-47)', () => {
    const { faltan, listo } = revisarCierre([linea('1'), linea('2', { estadoPago: 'NO_PAGO' })]);

    expect(listo).toBe(true);
    expect(faltan).toEqual({ pendientes: [] });
  });

  it('no está listo con líneas Pendientes; No pagó sí permite finalizar', () => {
    const { faltan, listo } = revisarCierre([linea('1', { estadoPago: 'PENDIENTE' }), linea('2', { estadoPago: 'NO_PAGO' })]);

    expect(listo).toBe(false);
    expect(faltan.pendientes.map((l) => l.id)).toEqual(['1']);
  });

  it('las líneas de $0 quedan fuera de las reglas de pago (D-27)', () => {
    const todoCancelado = linea('1', { prendas: [{ id: 'p', precio: 5000, estado: 'CANCELADA' }], estadoPago: 'PENDIENTE' });

    expect(revisarCierre([todoCancelado]).listo).toBe(true);
  });

  it('el resumen suma total, pagado y sin pagar', () => {
    const { resumen } = revisarCierre([linea('1'), linea('2'), linea('3', { estadoPago: 'NO_PAGO' }), linea('4', { estadoPago: 'PENDIENTE' })]);

    expect(resumen).toEqual({ total: 40000, pagado: 20000, sinPagar: 10000 });
  });
});
