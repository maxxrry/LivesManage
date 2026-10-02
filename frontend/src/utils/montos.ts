import type { Linea, MontoClp, Prenda } from '../types/dominio';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

/** 17000 → "$17.000". */
export function formatearClp(monto: MontoClp): string {
  return clp.format(monto);
}

/** Total de una línea: suma solo las prendas vigentes. */
export function totalLinea(prendas: Prenda[]): MontoClp {
  return prendas.reduce((suma, p) => (p.estado === 'VIGENTE' ? suma + p.precio : suma), 0);
}

export interface TotalesLive {
  total: MontoClp;
  pagado: MontoClp;
  /** Solo líneas Pendientes; lo "No pagó" ya no se cobra (D-23). */
  pendiente: MontoClp;
  /** Una línea por clienta, aunque tenga todo cancelado (D-23). */
  clientas: number;
}

/** RF-08: totales de un live. Única fórmula para la pantalla de live y la lista de lives. */
export function totalesDeLineas(lineas: Linea[]): TotalesLive {
  const totales: TotalesLive = { total: 0, pagado: 0, pendiente: 0, clientas: lineas.length };
  for (const linea of lineas) {
    const monto = totalLinea(linea.prendas);
    totales.total += monto;
    if (linea.estadoPago === 'PAGADO') totales.pagado += monto;
    if (linea.estadoPago === 'PENDIENTE') totales.pendiente += monto;
  }
  return totales;
}
