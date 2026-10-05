import { describe, expect, it } from 'vitest';
import type { Clienta, CompraClienta, EstadoPago, EstadoSesion } from '../types/dominio';
import { clientasInactivas, rankingDeClientas } from './clientas';

const clienta = (id: string, nombre: string, extra: Partial<Clienta> = {}): Clienta => ({ id, nombre, activa: true, ...extra });

const clientas = [
  clienta('c-1', 'Gabriela Peña', { usuarioTiktok: '@gabi.pena' }),
  clienta('c-2', 'Florencia Ruiz', { telefono: '+56 9 8765 4321' }),
  clienta('c-3', 'Javiera Soto'),
  clienta('c-4', 'Camila Rojas', { activa: false }),
];

let id = 0;
/** Compra de una clienta en un live del día indicado (aaaa-mm-dd), por un monto en miles. */
function compra(
  clientaId: string,
  dia: string,
  miles: number,
  pago: EstadoPago = 'PAGADO',
  estado: EstadoSesion = 'CERRADA',
): CompraClienta {
  id++;
  return {
    sesion: { id: `s-${id}`, inicio: `${dia}T21:00:00-03:00`, estado },
    linea: {
      id: `l-${id}`,
      sesionId: `s-${id}`,
      clientaId,
      clientaNombre: '',
      prendas: [{ id: `p-${id}`, precio: miles * 1000, estado: 'VIGENTE' }],
      estadoPago: pago,
      bolsaRevisada: true,
      actualizada: `${dia}T21:00:00-03:00`,
    },
  };
}

const todoSeptiembre = { desde: '2026-09-01', hasta: '2026-09-30' };
const nombres = (lista: { clienta: Clienta }[]) => lista.map((p) => p.clienta.nombre);

describe('rankingDeClientas (RF-14)', () => {
  const historial = [
    compra('c-1', '2026-09-03', 10),
    compra('c-1', '2026-09-10', 10),
    compra('c-1', '2026-09-17', 10), // Gabriela: 3 compras, $30.000
    compra('c-2', '2026-09-10', 45), // Florencia: 1 compra, $45.000
    compra('c-3', '2026-09-10', 20),
    compra('c-3', '2026-09-17', 20), // Javiera: 2 compras, $40.000
  ];

  it('criterio de aceptación: ordena por total gastado', () => {
    const ranking = rankingDeClientas(clientas, historial, 'TOTAL', todoSeptiembre);
    expect(nombres(ranking)).toEqual(['Florencia Ruiz', 'Javiera Soto', 'Gabriela Peña']);
    expect(ranking[0]).toMatchObject({ totalGastado: 45000, compras: 1 });
  });

  it('ordena por número de compras', () => {
    expect(nombres(rankingDeClientas(clientas, historial, 'COMPRAS', todoSeptiembre))).toEqual([
      'Gabriela Peña',
      'Javiera Soto',
      'Florencia Ruiz',
    ]);
  });

  it('solo cuenta compras dentro del rango de fechas (ambos días incluidos)', () => {
    const ranking = rankingDeClientas(clientas, historial, 'TOTAL', { desde: '2026-09-10', hasta: '2026-09-10' });
    expect(ranking.map((p) => [p.clienta.nombre, p.totalGastado])).toEqual([
      ['Florencia Ruiz', 45000],
      ['Javiera Soto', 20000],
      ['Gabriela Peña', 10000],
    ]);
  });

  it('la fecha del live es la de Chile, no la UTC', () => {
    // 30/09 a las 22:00 en Chile ya es 01/10 en UTC.
    const tarde = compra('c-1', '2026-09-30', 5);
    tarde.sesion.inicio = '2026-09-30T22:00:00-03:00';
    expect(rankingDeClientas(clientas, [tarde], 'TOTAL', todoSeptiembre)).toHaveLength(1);
  });

  it('empates: por total desempata compras y luego nombre; por compras desempata el total (D-30)', () => {
    const empate = [
      compra('c-3', '2026-09-03', 20),
      compra('c-2', '2026-09-03', 20),
      compra('c-1', '2026-09-03', 10),
      compra('c-1', '2026-09-04', 10),
    ];
    expect(nombres(rankingDeClientas(clientas, empate, 'TOTAL', todoSeptiembre))).toEqual([
      'Gabriela Peña', // $20.000 en 2 compras
      'Florencia Ruiz', // $20.000 en 1 compra; F antes que J
      'Javiera Soto',
    ]);
    const porCompras = [compra('c-2', '2026-09-03', 5), compra('c-3', '2026-09-03', 9)];
    expect(nombres(rankingDeClientas(clientas, porCompras, 'COMPRAS', todoSeptiembre))).toEqual([
      'Javiera Soto',
      'Florencia Ruiz',
    ]);
  });

  it('usa la definición de compra de la ficha: Pagada, en live Cerrado (D-29)', () => {
    const otras = [compra('c-1', '2026-09-03', 50, 'NO_PAGO'), compra('c-2', '2026-09-03', 50, 'PAGADO', 'EN_CIERRE')];
    expect(rankingDeClientas(clientas, otras, 'TOTAL', todoSeptiembre)).toEqual([]);
  });

  it('incluye a las desactivadas: sus compras fueron reales (D-30)', () => {
    expect(nombres(rankingDeClientas(clientas, [compra('c-4', '2026-09-03', 5)], 'TOTAL', todoSeptiembre))).toEqual([
      'Camila Rojas',
    ]);
  });
});

describe('clientasInactivas (RF-14)', () => {
  const hoy = '2026-11-24T12:00:00-03:00';

  it('criterio de aceptación: sin compras hace 61 días aparece como inactiva; hace 60, no', () => {
    const historial = [compra('c-1', '2026-09-24', 5), compra('c-2', '2026-09-25', 5)]; // 61 y 60 días antes
    const inactivas = clientasInactivas(clientas, historial, hoy, 60);
    expect(inactivas.map((i) => [i.clienta.nombre, i.diasSinComprar])).toEqual([['Gabriela Peña', 61]]);
    expect(inactivas[0]?.ultimaCompra).toBe('2026-09-24T21:00:00-03:00');
  });

  it('cuenta desde su última compra y ordena por más días sin comprar', () => {
    const historial = [compra('c-1', '2026-06-01', 5), compra('c-1', '2026-08-01', 5), compra('c-3', '2026-07-01', 5)];
    expect(clientasInactivas(clientas, historial, hoy, 60).map((i) => [i.clienta.nombre, i.diasSinComprar])).toEqual([
      ['Javiera Soto', 146],
      ['Gabriela Peña', 115],
    ]);
  });

  it('respeta los días configurados', () => {
    const historial = [compra('c-1', '2026-09-24', 5)];
    expect(clientasInactivas(clientas, historial, hoy, 90)).toEqual([]);
    expect(clientasInactivas(clientas, historial, hoy, 30)).toHaveLength(1);
  });

  it('sin ninguna compra no es inactiva (ERS: al menos una compra); tampoco con solo No pagó', () => {
    expect(clientasInactivas(clientas, [compra('c-1', '2026-06-01', 5, 'NO_PAGO')], hoy, 60)).toEqual([]);
  });

  it('las desactivadas no aparecen (D-30)', () => {
    expect(clientasInactivas(clientas, [compra('c-4', '2026-06-01', 5)], hoy, 60)).toEqual([]);
  });
});
