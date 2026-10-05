import type { Entrega, Linea, MontoClp, TipoEntrega } from '../types/dominio';
import { totalLinea } from './montos';

export interface RevisionCierre {
  /** Lo que impide finalizar, por regla del ERS (3.2.4). */
  faltan: {
    bolsas: Linea[];
    pendientes: Linea[];
    /** Pagadas sin entrega, o con despacho sin dirección. */
    sinEntrega: Linea[];
  };
  listo: boolean;
  resumen: {
    total: MontoClp;
    pagado: MontoClp;
    sinPagar: MontoClp;
    /** Por entrega, no por clienta: dos hermanas agrupadas son un despacho (D-27). */
    entregas: Record<TipoEntrega, number>;
  };
}

/**
 * RF-11: reglas para finalizar el cierre y resumen. La usan el servicio (al finalizar) y la pantalla (para mostrar
 * qué falta). Las líneas de $0 (todo cancelado) quedan fuera de las reglas de pago y entrega (D-27).
 */
export function revisarCierre(lineas: Linea[], entregas: Entrega[]): RevisionCierre {
  const faltan: RevisionCierre['faltan'] = { bolsas: [], pendientes: [], sinEntrega: [] };
  const resumen: RevisionCierre['resumen'] = {
    total: 0,
    pagado: 0,
    sinPagar: 0,
    entregas: { DESPACHO: 0, RETIRO: 0, FERIA: 0 },
  };
  const entregasPagadas = new Set<Entrega>();

  for (const linea of lineas) {
    const monto = totalLinea(linea.prendas);
    const entrega = entregas.find((e) => e.id === linea.entregaId);
    resumen.total += monto;
    if (!linea.bolsaRevisada) faltan.bolsas.push(linea);
    if (monto === 0) continue;

    if (linea.estadoPago === 'PENDIENTE') faltan.pendientes.push(linea);
    if (linea.estadoPago === 'NO_PAGO') resumen.sinPagar += monto;
    if (linea.estadoPago === 'PAGADO') {
      resumen.pagado += monto;
      if (!entrega || (entrega.tipo === 'DESPACHO' && !entrega.direccion)) faltan.sinEntrega.push(linea);
      else entregasPagadas.add(entrega); // solo se cuentan las entregas que se harán
    }
  }
  for (const entrega of entregasPagadas) resumen.entregas[entrega.tipo] += 1;

  const listo = faltan.bolsas.length === 0 && faltan.pendientes.length === 0 && faltan.sinEntrega.length === 0;
  return { faltan, listo, resumen };
}
