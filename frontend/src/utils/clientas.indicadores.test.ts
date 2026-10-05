import { describe, expect, it } from 'vitest';
import type { CompraClienta, EstadoPago, EstadoSesion } from '../types/dominio';
import { indicadoresDeClienta } from './clientas';

let id = 0;
/** Compra en un live del día indicado; precios en miles, negativos = cancelada (ej: -7). */
function compra(dia: number, estado: EstadoSesion, pago: EstadoPago, ...miles: number[]): CompraClienta {
  id++;
  return {
    sesion: { id: `s-${id}`, inicio: `2026-09-${String(dia).padStart(2, '0')}T21:00:00-03:00`, estado },
    linea: {
      id: `l-${id}`,
      sesionId: `s-${id}`,
      clientaId: 'c-1',
      clientaNombre: 'Gabriela Peña',
      prendas: miles.map((m, i) => ({ id: `p-${id}-${i}`, precio: Math.abs(m) * 1000, estado: m < 0 ? 'CANCELADA' : 'VIGENTE' })),
      estadoPago: pago,
      bolsaRevisada: true,
      actualizada: '2026-09-01T00:00:00-03:00',
    },
  };
}

describe('indicadoresDeClienta (RF-13)', () => {
  it('sin compras: todo en cero y sin última compra', () => {
    expect(indicadoresDeClienta([])).toEqual({
      totalGastado: 0,
      compras: 0,
      ticketPromedio: 0,
      prendasCanceladas: 0,
      livesSinPago: 0,
    });
  });

  it('criterio de aceptación: total gastado = suma de sus líneas Pagadas en lives Cerrados', () => {
    const historial = [
      compra(1, 'CERRADA', 'PAGADO', 6, 6, 5), // 17.000
      compra(8, 'CERRADA', 'PAGADO', 10, -4), // 10.000 (el 4 cancelado no suma)
      compra(15, 'CERRADA', 'NO_PAGO', 9),
      compra(22, 'EN_CIERRE', 'PAGADO', 8),
      compra(29, 'ABIERTA', 'PAGADO', 5),
    ];
    expect(indicadoresDeClienta(historial).totalGastado).toBe(27000);
  });

  it('compras y ticket promedio usan la misma base que el total (D-29)', () => {
    const historial = [
      compra(1, 'CERRADA', 'PAGADO', 6, 6, 5),
      compra(8, 'CERRADA', 'PAGADO', 10),
      compra(15, 'CERRADA', 'PAGADO', -3), // $0: no es una compra (D-27)
      compra(22, 'ABIERTA', 'PAGADO', 20),
    ];
    const { compras, ticketPromedio } = indicadoresDeClienta(historial);
    expect(compras).toBe(2);
    expect(ticketPromedio).toBe(13500);
  });

  it('el ticket promedio es un entero en pesos', () => {
    const historial = [compra(1, 'CERRADA', 'PAGADO', 5), compra(2, 'CERRADA', 'PAGADO', 5), compra(3, 'CERRADA', 'PAGADO', 6)];
    expect(indicadoresDeClienta(historial).ticketPromedio).toBe(5333);
  });

  it('última compra: el live Cerrado más reciente con línea Pagada', () => {
    const historial = [
      compra(8, 'CERRADA', 'PAGADO', 5),
      compra(1, 'CERRADA', 'PAGADO', 5),
      compra(15, 'CERRADA', 'NO_PAGO', 5),
      compra(22, 'ABIERTA', 'PAGADO', 5),
    ];
    expect(indicadoresDeClienta(historial).ultimaCompra).toBe('2026-09-08T21:00:00-03:00');
  });

  it('prendas canceladas y lives sin pago cuentan solo lives Cerrados', () => {
    const historial = [
      compra(1, 'CERRADA', 'PAGADO', 6, -7, -3),
      compra(8, 'CERRADA', 'NO_PAGO', 9, -2),
      compra(15, 'CERRADA', 'NO_PAGO', 4),
      compra(22, 'ABIERTA', 'PENDIENTE', -5),
    ];
    const { prendasCanceladas, livesSinPago } = indicadoresDeClienta(historial);
    expect(prendasCanceladas).toBe(3);
    expect(livesSinPago).toBe(2);
  });
});
