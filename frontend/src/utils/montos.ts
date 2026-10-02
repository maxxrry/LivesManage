import type { MontoClp, Prenda } from '../types/dominio';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

/** 17000 → "$17.000". */
export function formatearClp(monto: MontoClp): string {
  return clp.format(monto);
}

/** Total de una línea: suma solo las prendas vigentes. */
export function totalLinea(prendas: Prenda[]): MontoClp {
  return prendas.reduce((suma, p) => (p.estado === 'VIGENTE' ? suma + p.precio : suma), 0);
}
