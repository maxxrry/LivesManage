import type { Clienta, Entrega, Linea, Prenda, Sesion, Usuario } from '../../types/dominio';

/**
 * Datos simulados en memoria, con la misma forma que devolverá la API.
 * Solo los servicios de src/services/ los leen.
 */

let siguientePrenda = 1;
/** Crea prendas vigentes desde precios en miles, como en el cuaderno (6 → $6.000). */
function prendas(...miles: number[]): Prenda[] {
  return miles.map((m) => ({
    id: `p-${siguientePrenda++}`,
    precio: m * 1000,
    estado: 'VIGENTE',
  }));
}

export const usuarios: Usuario[] = [
  { id: 'u-1', nombre: 'Administradora', correo: 'admin@livesmanage.cl', rol: 'ADMIN', activo: true },
];

export const clientas: Clienta[] = [
  { id: 'c-1', nombre: 'Gabriela Peña', usuarioTiktok: '@gabi.pena', activa: true },
  { id: 'c-2', nombre: 'Florencia Ruiz', telefono: '+56 9 8765 4321', activa: true },
  {
    id: 'c-3',
    nombre: 'Javiera Soto',
    usuarioTiktok: '@javisoto',
    telefono: '+56 9 1234 5678',
    direccion: {
      calle: 'Los Aromos 1234, depto 52',
      comuna: 'Maipú',
      region: 'Metropolitana',
      referencia: 'Portón verde',
    },
    activa: true,
  },
  { id: 'c-4', nombre: 'Camila Rojas', activa: true },
  { id: 'c-5', nombre: 'Antonia Muñoz', usuarioTiktok: '@anto.munoz', activa: true },
  // Hermana de Javiera: comparten despacho en el live anterior.
  { id: 'c-6', nombre: 'Valentina Soto', activa: true },
];

export const sesiones: Sesion[] = [
  { id: 's-1', nombre: 'Live jueves noche', inicio: '2026-09-24T21:00:00-03:00', estado: 'CERRADA' },
  { id: 's-2', nombre: 'Live martes', inicio: '2026-09-29T20:30:00-03:00', estado: 'ABIERTA' },
];

export const entregas: Entrega[] = [
  // Entrega agrupada de las hermanas Soto (D-05).
  {
    id: 'e-1',
    sesionId: 's-1',
    tipo: 'DESPACHO',
    direccion: {
      calle: 'Los Aromos 1234, depto 52',
      comuna: 'Maipú',
      region: 'Metropolitana',
    },
  },
  { id: 'e-2', sesionId: 's-2', tipo: 'RETIRO' },
];

const lineasLiveAnterior: Linea[] = [
  {
    id: 'l-1',
    sesionId: 's-1',
    clientaId: 'c-3',
    clientaNombre: 'Javiera Soto',
    prendas: prendas(7, 5),
    estadoPago: 'PAGADO',
    pagoActualizado: { fecha: '2026-09-24T23:10:00-03:00', usuarioId: 'u-1' },
    bolsaRevisada: true,
    entregaId: 'e-1',
    actualizada: '2026-09-24T23:10:00-03:00',
  },
  {
    id: 'l-2',
    sesionId: 's-1',
    clientaId: 'c-6',
    clientaNombre: 'Valentina Soto',
    prendas: prendas(4),
    estadoPago: 'PAGADO',
    pagoActualizado: { fecha: '2026-09-24T23:12:00-03:00', usuarioId: 'u-1' },
    bolsaRevisada: true,
    entregaId: 'e-1',
    actualizada: '2026-09-24T23:12:00-03:00',
  },
  {
    id: 'l-3',
    sesionId: 's-1',
    clientaId: 'c-1',
    clientaNombre: 'Gabriela Peña',
    prendas: prendas(9),
    estadoPago: 'NO_PAGO',
    bolsaRevisada: true,
    actualizada: '2026-09-25T12:00:00-03:00',
  },
];

// Live Abierto: 5 líneas tipo cuaderno.
const lineasLiveAbierto: Linea[] = [
  {
    // "Gabriela Peña 6-6-5 = 17.000"
    id: 'l-4',
    sesionId: 's-2',
    clientaId: 'c-1',
    clientaNombre: 'Gabriela Peña',
    prendas: prendas(6, 6, 5),
    estadoPago: 'PENDIENTE',
    bolsaRevisada: false,
    actualizada: '2026-09-29T20:41:00-03:00',
  },
  {
    // "Florencia Ruiz 6-4 = 10.000"
    id: 'l-5',
    sesionId: 's-2',
    clientaId: 'c-2',
    clientaNombre: 'Florencia Ruiz',
    prendas: prendas(6, 4),
    estadoPago: 'PENDIENTE',
    bolsaRevisada: false,
    actualizada: '2026-09-29T20:45:00-03:00',
  },
  {
    // "Javiera Soto 8-5 = 13.000", pagada (rosado en el cuaderno)
    id: 'l-6',
    sesionId: 's-2',
    clientaId: 'c-3',
    clientaNombre: 'Javiera Soto',
    prendas: prendas(8, 5),
    estadoPago: 'PAGADO',
    pagoActualizado: { fecha: '2026-09-29T20:58:00-03:00', usuarioId: 'u-1' },
    bolsaRevisada: false,
    entregaId: 'e-2',
    actualizada: '2026-09-29T20:58:00-03:00',
  },
  {
    // "Camila Rojas 5-7-3", con el 7 tachado = 8.000
    id: 'l-7',
    sesionId: 's-2',
    clientaId: 'c-4',
    clientaNombre: 'Camila Rojas',
    prendas: prendas(5, 7, 3).map((p) => (p.precio === 7000 ? { ...p, estado: 'CANCELADA' } : p)),
    estadoPago: 'PENDIENTE',
    bolsaRevisada: false,
    actualizada: '2026-09-29T21:02:00-03:00',
  },
  {
    // "Antonia Muñoz 10 = 10.000"
    id: 'l-8',
    sesionId: 's-2',
    clientaId: 'c-5',
    clientaNombre: 'Antonia Muñoz',
    prendas: prendas(10),
    estadoPago: 'PENDIENTE',
    bolsaRevisada: false,
    actualizada: '2026-09-29T21:05:00-03:00',
  },
];

export const lineas: Linea[] = [...lineasLiveAnterior, ...lineasLiveAbierto];
