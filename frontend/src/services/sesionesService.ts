import type { Clienta, Linea, MontoClp, Prenda, Sesion, SesionDetalle, SesionResumen } from '../types/dominio';
import { totalLinea } from '../utils/montos';
import { clientas, entregas, lineas, nuevoId, sesiones } from './mock/datos';

// Simulado en memoria. Con backend:
//   GET    /api/lives                          listarSesiones
//   POST   /api/lives                          abrirSesion
//   GET    /api/lives/{id}                     obtenerSesion
//   POST   /api/lives/{id}/anotaciones         anotar
//   DELETE /api/lives/{id}/anotaciones/{aid}   deshacerAnotacion
//   PATCH  /api/lives/{id}/lineas/{lid}/prendas/{pid}   alternarPrenda
//   PATCH  /api/lives/{id}/lineas/{lid}/clienta         cambiarClienta

/** RF-04: cada live con sus totales, calculados desde las prendas vigentes (como hará ms-lives). */
export async function listarSesiones(): Promise<SesionResumen[]> {
  return sesiones.map((sesion) => {
    const suyas = lineas.filter((l) => l.sesionId === sesion.id);
    const sumar = (ls: Linea[]) => ls.reduce((suma, l) => suma + totalLinea(l.prendas), 0);
    return {
      ...structuredClone(sesion),
      clientas: suyas.length,
      total: sumar(suyas),
      totalPagado: sumar(suyas.filter((l) => l.estadoPago === 'PAGADO')),
    };
  });
}

/** RF-04: abre un live nuevo. Solo puede haber uno Abierto; uno En cierre no bloquea. */
export async function abrirSesion(nombre?: string): Promise<Sesion> {
  if (sesiones.some((s) => s.estado === 'ABIERTA')) {
    throw new Error('Ya hay un live abierto. Continúa en él o termínalo antes de abrir otro.');
  }
  const sesion: Sesion = { id: nuevoId('s'), inicio: new Date().toISOString(), estado: 'ABIERTA' };
  if (nombre?.trim()) sesion.nombre = nombre.trim();
  sesiones.push(sesion);
  return structuredClone(sesion);
}

export async function obtenerSesion(id: string): Promise<SesionDetalle> {
  const sesion = sesiones.find((s) => s.id === id);
  if (!sesion) {
    throw new Error('Live no encontrado');
  }
  return structuredClone({
    sesion,
    lineas: lineas.filter((l) => l.sesionId === id),
    entregas: entregas.filter((e) => e.sesionId === id),
  });
}

/** A quién se anota: una clienta existente o una nueva con ese nombre. */
export type DestinoAnotacion = { clientaId: string } | { nuevaClienta: string };

export interface ResultadoAnotar {
  anotacionId: string;
  linea: Linea;
}

/** Lo necesario para deshacer una anotación (D-11). */
interface Anotacion {
  lineaId: string;
  prendaIds: string[];
  lineaCreada: boolean;
  actualizadaAnterior?: string;
  clientaCreadaId?: string;
}
const anotaciones = new Map<string, Anotacion>();

/** La clienta existente del destino, o una nueva creada con ese nombre. */
function resolverClienta(destino: DestinoAnotacion): Clienta {
  if ('clientaId' in destino) {
    const clienta = clientas.find((c) => c.id === destino.clientaId);
    if (!clienta) throw new Error('Clienta no encontrada');
    return clienta;
  }
  const nombre = destino.nuevaClienta.trim();
  if (!nombre) throw new Error('Falta el nombre de la clienta.');
  const clienta: Clienta = { id: nuevoId('c'), nombre, activa: true };
  clientas.push(clienta);
  return clienta;
}

const precioValido = (p: MontoClp) => Number.isInteger(p) && p >= 1000 && p <= 999_000 && p % 1000 === 0;

/**
 * RF-05: agrega prendas a la línea de la clienta en el live, o crea la línea (y la clienta si es nueva).
 * Valida todo antes de modificar, para que la anotación se guarde completa o no se guarde (RNF-12).
 */
export async function anotar(sesionId: string, destino: DestinoAnotacion, precios: MontoClp[]): Promise<ResultadoAnotar> {
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (!sesion) throw new Error('Live no encontrado');
  if (sesion.estado !== 'ABIERTA') throw new Error('El live no está abierto; no se puede anotar.');
  if (precios.length === 0 || !precios.every(precioValido)) throw new Error('Precios no válidos.');

  const clienta = resolverClienta(destino);

  const ahora = new Date().toISOString();
  const nuevas: Prenda[] = precios.map((precio) => ({ id: nuevoId('p'), precio, estado: 'VIGENTE' }));
  const existente = lineas.find((l) => l.sesionId === sesionId && l.clientaId === clienta.id);
  const anotacion: Omit<Anotacion, 'lineaId'> = {
    prendaIds: nuevas.map((p) => p.id),
    lineaCreada: !existente,
    actualizadaAnterior: existente?.actualizada,
    clientaCreadaId: 'nuevaClienta' in destino ? clienta.id : undefined,
  };

  let linea: Linea;
  if (existente) {
    existente.prendas.push(...nuevas);
    existente.actualizada = ahora;
    linea = existente;
  } else {
    linea = {
      id: nuevoId('l'),
      sesionId,
      clientaId: clienta.id,
      clientaNombre: clienta.nombre,
      prendas: nuevas,
      estadoPago: 'PENDIENTE',
      bolsaRevisada: false,
      actualizada: ahora,
    };
    lineas.push(linea);
  }

  const anotacionId = nuevoId('a');
  anotaciones.set(anotacionId, { ...anotacion, lineaId: linea.id });
  return structuredClone({ anotacionId, linea });
}

/** D-11: elimina lo que creó la anotación (prendas, y la línea y la clienta si eran nuevas). */
export async function deshacerAnotacion(anotacionId: string): Promise<void> {
  const anotacion = anotaciones.get(anotacionId);
  if (!anotacion) throw new Error('La anotación ya no se puede deshacer.');
  anotaciones.delete(anotacionId);

  const i = lineas.findIndex((l) => l.id === anotacion.lineaId);
  const linea = lineas[i];
  if (linea) {
    if (anotacion.lineaCreada) {
      lineas.splice(i, 1);
    } else {
      linea.prendas = linea.prendas.filter((p) => !anotacion.prendaIds.includes(p.id));
      linea.actualizada = anotacion.actualizadaAnterior ?? linea.actualizada;
    }
  }

  const j = clientas.findIndex((c) => c.id === anotacion.clientaCreadaId);
  if (j >= 0) clientas.splice(j, 1);
}

/** Línea de un live que se puede corregir: existe y el live no está Cerrado (RF-06). */
function lineaEditable(sesionId: string, lineaId: string): Linea {
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (!sesion) throw new Error('Live no encontrado');
  if (sesion.estado === 'CERRADA') throw new Error('El live está cerrado: es solo lectura.');
  const linea = lineas.find((l) => l.id === lineaId && l.sesionId === sesionId);
  if (!linea) throw new Error('Línea no encontrada');
  return linea;
}

/** RF-06: cancela una prenda vigente o restaura una cancelada. Nunca se borra ni reordena la hoja (D-18). */
export async function alternarPrenda(sesionId: string, lineaId: string, prendaId: string): Promise<Linea> {
  const linea = lineaEditable(sesionId, lineaId);
  const prenda = linea.prendas.find((p) => p.id === prendaId);
  if (!prenda) throw new Error('Prenda no encontrada');
  prenda.estado = prenda.estado === 'VIGENTE' ? 'CANCELADA' : 'VIGENTE';
  return structuredClone(linea);
}

/**
 * RF-06: cambia la clienta de una línea. Si la clienta elegida ya tiene línea en el live,
 * une ambas con las reglas de D-19 y devuelve la línea resultante.
 */
export async function cambiarClienta(sesionId: string, lineaId: string, destino: DestinoAnotacion): Promise<Linea> {
  const linea = lineaEditable(sesionId, lineaId);
  if ('clientaId' in destino && destino.clientaId === linea.clientaId) return structuredClone(linea);

  const clienta = resolverClienta(destino);
  const otra = lineas.find((l) => l.sesionId === sesionId && l.clientaId === clienta.id);
  const ahora = new Date().toISOString();

  // Las anotaciones sobre estas líneas ya no se pueden deshacer (D-19).
  for (const [id, a] of anotaciones) {
    if (a.lineaId === linea.id || a.lineaId === otra?.id) anotaciones.delete(id);
  }

  if (!otra) {
    linea.clientaId = clienta.id;
    linea.clientaNombre = clienta.nombre;
    linea.actualizada = ahora;
    return structuredClone(linea);
  }

  otra.prendas.push(...linea.prendas);
  otra.estadoPago = otra.estadoPago === 'PAGADO' && linea.estadoPago === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';
  otra.bolsaRevisada = otra.bolsaRevisada && linea.bolsaRevisada;
  otra.entregaId = otra.entregaId ?? linea.entregaId;
  otra.actualizada = ahora;
  lineas.splice(lineas.indexOf(linea), 1);
  return structuredClone(otra);
}
