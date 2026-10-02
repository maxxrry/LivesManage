import { describe, expect, it } from 'vitest';
import type { Prenda } from '../types/dominio';
import { formatearClp, totalLinea } from './montos';

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
