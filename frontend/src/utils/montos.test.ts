import { describe, expect, it } from 'vitest';
import type { Linea, Prenda } from '../types/dominio';
import { formatearClp, totalesDeLineas, totalLinea } from './montos';

const prenda = (precio: number, estado: Prenda['estado'] = 'VIGENTE'): Prenda => ({ id: `p-${precio}`, precio, estado });

describe('totalLinea', () => {
  it('suma las prendas vigentes: 6-6-5 = 17.000', () => {
    expect(totalLinea([prenda(6000), prenda(6000), prenda(5000)])).toBe(17000);
  });

  it('no suma las prendas canceladas', () => {
    expect(totalLinea([prenda(5000), prenda(7000, 'CANCELADA'), prenda(3000)])).toBe(8000);
  });

  it('una línea sin prendas vigentes suma 0', () => {
    expect(totalLinea([])).toBe(0);
    expect(totalLinea([prenda(7000, 'CANCELADA')])).toBe(0);
  });
});

describe('totalesDeLineas (RF-08, D-23)', () => {
  const linea = (estadoPago: Linea['estadoPago'], ...prendas: Prenda[]): Linea => ({
    id: `l-${Math.random()}`,
    sesionId: 's',
    clientaId: 'c',
    clientaNombre: 'X',
    prendas,
    estadoPago,
    bolsaRevisada: false,
    actualizada: '2026-10-02T20:00:00-03:00',
  });

  it('suma total, pagado y pendiente desde las prendas vigentes', () => {
    const lineas = [
      linea('PENDIENTE', prenda(6000), prenda(6000), prenda(5000)), // 17.000
      linea('PAGADO', prenda(8000), prenda(5000)), // 13.000
      linea('PENDIENTE', prenda(5000), prenda(7000, 'CANCELADA'), prenda(3000)), // 8.000
    ];
    expect(totalesDeLineas(lineas)).toEqual({ total: 38000, pagado: 13000, pendiente: 25000, clientas: 3 });
  });

  it('lo No pagó cuenta en el total, pero no es pagado ni pendiente', () => {
    const lineas = [linea('PAGADO', prenda(4000)), linea('NO_PAGO', prenda(9000))];
    expect(totalesDeLineas(lineas)).toEqual({ total: 13000, pagado: 4000, pendiente: 0, clientas: 2 });
  });

  it('cuenta como clienta una línea con todas sus prendas canceladas', () => {
    const lineas = [linea('PENDIENTE', prenda(7000, 'CANCELADA'))];
    expect(totalesDeLineas(lineas)).toEqual({ total: 0, pagado: 0, pendiente: 0, clientas: 1 });
  });

  it('un live sin líneas tiene todo en cero', () => {
    expect(totalesDeLineas([])).toEqual({ total: 0, pagado: 0, pendiente: 0, clientas: 0 });
  });
});

describe('formatearClp', () => {
  it.each([
    [17000, '$17.000'],
    [999000, '$999.000'],
    [1500000, '$1.500.000'],
    [0, '$0'],
  ])('%i → %s', (monto, texto) => {
    expect(formatearClp(monto)).toBe(texto);
  });
});
