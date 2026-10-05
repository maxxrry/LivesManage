import { describe, expect, it } from 'vitest';
import type { Entrega, Linea } from '../types/dominio';
import { revisarCierre } from './cierre';

const DIRECCION = { calle: 'Los Aromos 1234', comuna: 'Maipú', region: 'Metropolitana' };

function linea(id: string, cambios: Partial<Linea> = {}): Linea {
  return {
    id,
    sesionId: 's',
    clientaId: `c-${id}`,
    clientaNombre: `Clienta ${id}`,
    prendas: [{ id: `p-${id}`, precio: 10000, estado: 'VIGENTE' }],
    estadoPago: 'PAGADO',
    bolsaRevisada: true,
    entregaId: 'e-retiro',
    actualizada: '2026-10-03T12:00:00-03:00',
    ...cambios,
  };
}

const retiro: Entrega = { id: 'e-retiro', sesionId: 's', tipo: 'RETIRO' };

describe('revisarCierre (RF-11)', () => {
  it('sin faltantes cuando todo está revisado, cobrado y con entrega', () => {
    const { faltan, listo } = revisarCierre([linea('1'), linea('2')], [retiro]);

    expect(listo).toBe(true);
    expect(faltan).toEqual({ bolsas: [], pendientes: [], sinEntrega: [] });
  });

  it('no está listo con bolsas sin revisar', () => {
    const { faltan, listo } = revisarCierre([linea('1', { bolsaRevisada: false }), linea('2')], [retiro]);

    expect(listo).toBe(false);
    expect(faltan.bolsas.map((l) => l.id)).toEqual(['1']);
  });

  it('no está listo con líneas Pendientes; No pagó sí permite finalizar', () => {
    const { faltan, listo } = revisarCierre(
      [linea('1', { estadoPago: 'PENDIENTE', entregaId: undefined }), linea('2', { estadoPago: 'NO_PAGO', entregaId: undefined })],
      [],
    );

    expect(listo).toBe(false);
    expect(faltan.pendientes.map((l) => l.id)).toEqual(['1']);
    expect(faltan.sinEntrega).toEqual([]);
  });

  it('toda línea Pagada necesita entrega, y dirección si es despacho', () => {
    const despachoSinDireccion: Entrega = { id: 'e-d', sesionId: 's', tipo: 'DESPACHO' };

    const { faltan } = revisarCierre(
      [linea('1', { entregaId: undefined }), linea('2', { entregaId: 'e-d' }), linea('3')],
      [retiro, despachoSinDireccion],
    );

    expect(faltan.sinEntrega.map((l) => l.id)).toEqual(['1', '2']);
  });

  it('las líneas de $0 quedan fuera de las reglas de pago y entrega (D-27)', () => {
    const todoCancelado = linea('1', {
      prendas: [{ id: 'p', precio: 5000, estado: 'CANCELADA' }],
      estadoPago: 'PENDIENTE',
      entregaId: undefined,
    });

    const { faltan, listo } = revisarCierre([todoCancelado], []);

    expect(listo).toBe(true);
    expect(faltan.pendientes).toEqual([]);
  });

  it('el resumen suma total, pagado y sin pagar, y cuenta las entregas por tipo', () => {
    const despacho: Entrega = { id: 'e-d', sesionId: 's', tipo: 'DESPACHO', direccion: DIRECCION };
    const feria: Entrega = { id: 'e-f', sesionId: 's', tipo: 'FERIA' };
    const lineas = [
      // Hermanas agrupadas: un solo despacho (D-27).
      linea('1', { entregaId: 'e-d' }),
      linea('2', { entregaId: 'e-d' }),
      linea('3'),
      linea('4', { estadoPago: 'NO_PAGO', entregaId: 'e-f' }),
    ];

    const { resumen } = revisarCierre(lineas, [despacho, retiro, feria]);

    expect(resumen).toEqual({
      total: 40000,
      pagado: 30000,
      sinPagar: 10000,
      entregas: { DESPACHO: 1, RETIRO: 1, FERIA: 0 },
    });
  });
});
