import type { Linea, MontoClp } from '../types/dominio';
import { totalLinea } from './montos';

export interface RevisionCierre {
  /** Lo que impide finalizar: líneas Pendientes (RF-11). Bolsas y entrega van en la ficha (D-47). */
  faltan: { pendientes: Linea[] };
  listo: boolean;
  resumen: { total: MontoClp; pagado: MontoClp; sinPagar: MontoClp };
}

/**
 * RF-11: reglas para finalizar el cierre y resumen. La usan el servicio (al finalizar) y la pantalla (para mostrar
 * qué falta). Las líneas de $0 (todo cancelado) quedan fuera de las reglas de pago (D-27).
 */
export function revisarCierre(lineas: Linea[]): RevisionCierre {
  const faltan: RevisionCierre['faltan'] = { pendientes: [] };
  const resumen: RevisionCierre['resumen'] = { total: 0, pagado: 0, sinPagar: 0 };

  for (const linea of lineas) {
    const monto = totalLinea(linea.prendas);
    resumen.total += monto;
    if (monto === 0) continue;
    if (linea.estadoPago === 'PENDIENTE') faltan.pendientes.push(linea);
    if (linea.estadoPago === 'NO_PAGO') resumen.sinPagar += monto;
    if (linea.estadoPago === 'PAGADO') resumen.pagado += monto;
  }

  return { faltan, listo: faltan.pendientes.length === 0, resumen };
}
