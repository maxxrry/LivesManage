import type { Clienta, Linea, MontoClp, Prenda, Sesion, SesionDetalle } from '../types/dominio';
import { clientas, entregas, lineas, nuevoId, sesiones } from './mock/datos';

// Simulado en memoria. Con backend:
//   GET    /api/lives                          listarSesiones
//   GET    /api/lives/{id}                     obtenerSesion
//   POST   /api/lives/{id}/anotaciones         anotar
//   DELETE /api/lives/{id}/anotaciones/{aid}   deshacerAnotacion

export async function listarSesiones(): Promise<Sesion[]> {
  return structuredClone(sesiones);
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

  let clienta: Clienta | undefined;
  if ('clientaId' in destino) {
    clienta = clientas.find((c) => c.id === destino.clientaId);
    if (!clienta) throw new Error('Clienta no encontrada');
  } else {
    const nombre = destino.nuevaClienta.trim();
    if (!nombre) throw new Error('Falta el nombre de la clienta.');
    clienta = { id: nuevoId('c'), nombre, activa: true };
    clientas.push(clienta);
  }

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
