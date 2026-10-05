import {
  type Clienta,
  type CompraClienta,
  type Direccion,
  type Entrega,
  type EstadoPago,
  type Linea,
  type MontoClp,
  type Prenda,
  type Sesion,
  type SesionDetalle,
  type SesionResumen,
  type TipoEntrega,
} from '../types/dominio';
import { revisarCierre } from '../utils/cierre';
import { normalizarDireccion } from '../utils/clientas';
import { totalesDeLineas } from '../utils/montos';
import { clientas, entregas, lineas, nuevoId, sesiones, usuarios } from './mock/datos';

// Simulado en memoria. Con backend:
//   GET    /api/lives                          listarSesiones
//   POST   /api/lives                          abrirSesion
//   GET    /api/lives/{id}                     obtenerSesion
//   POST   /api/lives/{id}/anotaciones         anotar
//   DELETE /api/lives/{id}/anotaciones/{aid}   deshacerAnotacion
//   PATCH  /api/lives/{id}/lineas/{lid}/prendas/{pid}   alternarPrenda
//   PATCH  /api/lives/{id}/lineas/{lid}/clienta         cambiarClienta
//   PATCH  /api/lives/{id}/lineas/{lid}/pago            alternarPago
//   POST   /api/lives/{id}/terminar                     terminarSesion
//   PATCH  /api/lives/{id}/lineas/{lid}/bolsa           alternarBolsa
//   PUT    /api/lives/{id}/lineas/{lid}/entrega         registrarEntrega
//   PATCH  /api/lives/{id}/lineas/{lid}/entrega         agruparEntrega
//   PUT    /api/lives/{id}/lineas/{lid}/no-pago         marcarNoPago
//   POST   /api/lives/{id}/finalizar                    finalizarCierre
//   POST   /api/lives/{id}/reabrir                      reabrirSesion
//   GET    /api/lives/lineas?clientaId={cid}           historialDeClienta
//   GET    /api/lives/lineas                           listarCompras

/** RF-04: cada live con sus totales, calculados desde las prendas vigentes (como hará ms-lives). */
export async function listarSesiones(): Promise<SesionResumen[]> {
  return sesiones.map((sesion) => {
    const { total, pagado, clientas: numero } = totalesDeLineas(lineas.filter((l) => l.sesionId === sesion.id));
    return { ...structuredClone(sesion), clientas: numero, total, totalPagado: pagado };
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
  /** Pago de la línea antes de anotar, si la anotación la devolvió a Pendiente (D-20). */
  pagoAnterior?: Pick<Linea, 'estadoPago' | 'pagoActualizado'>;
}
const anotaciones = new Map<string, Anotacion>();

// Usuario autenticado. Simulado: la administradora; con backend sale del JWT.
const usuarioSesionId = () => usuarios[0]?.id ?? 'desconocido';

/** Cambia el estado de pago y registra fecha, hora y usuario (RF-07). */
function registrarPago(linea: Linea, estado: EstadoPago): void {
  linea.estadoPago = estado;
  linea.pagoActualizado = { fecha: new Date().toISOString(), usuarioId: usuarioSesionId() };
}

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
    if (existente.estadoPago === 'PAGADO') {
      anotacion.pagoAnterior = structuredClone({ estadoPago: existente.estadoPago, pagoActualizado: existente.pagoActualizado });
      registrarPago(existente, 'PENDIENTE'); // D-20: hay un monto sin cobrar
    }
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
      if (anotacion.pagoAnterior) Object.assign(linea, anotacion.pagoAnterior);
    }
  }

  const j = clientas.findIndex((c) => c.id === anotacion.clientaCreadaId);
  if (j >= 0) clientas.splice(j, 1);
}

/** Tras cualquier cambio en una línea, sus anotaciones ya no se pueden deshacer (D-19, D-22). */
function anularDeshacer(...lineaIds: (string | undefined)[]): void {
  for (const [id, a] of anotaciones) {
    if (lineaIds.includes(a.lineaId)) anotaciones.delete(id);
  }
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
  anularDeshacer(linea.id);
  prenda.estado = prenda.estado === 'VIGENTE' ? 'CANCELADA' : 'VIGENTE';
  // D-20: restaurar en una línea Pagada agrega un monto sin cobrar. Cancelar la deja Pagada.
  if (prenda.estado === 'VIGENTE' && linea.estadoPago === 'PAGADO') registrarPago(linea, 'PENDIENTE');
  return structuredClone(linea);
}

/** RF-07: pasa la línea de Pendiente a Pagado o al revés. No reordena la hoja (D-21). */
export async function alternarPago(sesionId: string, lineaId: string): Promise<Linea> {
  const linea = lineaEditable(sesionId, lineaId);
  if (linea.estadoPago === 'NO_PAGO') throw new Error('"No pagó" se revisa en el cierre del live.');
  anularDeshacer(linea.id);
  registrarPago(linea, linea.estadoPago === 'PAGADO' ? 'PENDIENTE' : 'PAGADO');
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

  anularDeshacer(linea.id, otra?.id);

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
  quitarEntregasVacias(sesionId); // la entrega de la línea unida pudo quedar sin líneas
  return structuredClone(otra);
}

/** RF-09: termina el live. Pasa de Abierta a En cierre; desde ahí se puede abrir otro live. */
export async function terminarSesion(sesionId: string): Promise<Sesion> {
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (!sesion) throw new Error('Live no encontrado');
  if (sesion.estado !== 'ABIERTA') throw new Error('Solo se puede terminar un live abierto.');
  sesion.estado = 'EN_CIERRE';
  return structuredClone(sesion);
}

/** RF-09: marca o desmarca la bolsa revisada. Solo En cierre (D-25); no reordena la hoja. */
export async function alternarBolsa(sesionId: string, lineaId: string): Promise<Linea> {
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (sesion?.estado !== 'EN_CIERRE') throw new Error('Las bolsas se revisan en el cierre del live.');
  const linea = lineaEditable(sesionId, lineaId);
  linea.bolsaRevisada = !linea.bolsaRevisada;
  return structuredClone(linea);
}

/** Lo que se elige para una clienta en el cierre (RF-10). La dirección solo cuenta para Despacho. */
export interface DatosEntrega {
  tipo: TipoEntrega;
  direccion?: Direccion;
}

/** Línea de un live En cierre: solo ahí se registran entregas (RF-10). */
function lineaEnCierre(sesionId: string, lineaId: string): Linea {
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (sesion?.estado !== 'EN_CIERRE') throw new Error('La entrega se registra en el cierre del live.');
  return lineaEditable(sesionId, lineaId);
}

/** Despacho exige calle y comuna; la región es Metropolitana si no se indica (D-04). */
function direccionValida(direccion?: Direccion): Direccion {
  if (!direccion) throw new Error('El despacho necesita una dirección.');
  return normalizarDireccion(direccion);
}

/** Quita las entregas del live que ya no tienen líneas (D-05: la entrega no existe sin líneas). */
function quitarEntregasVacias(sesionId: string): void {
  for (let i = entregas.length - 1; i >= 0; i--) {
    const entrega = entregas[i]!;
    if (entrega.sesionId === sesionId && !lineas.some((l) => l.entregaId === entrega.id)) entregas.splice(i, 1);
  }
}

/**
 * RF-10: registra la forma de entrega de una clienta. Despacho exige dirección, que queda en su ficha.
 * Si la clienta compartía la entrega con otras, sale del grupo y las demás no cambian (D-26).
 * No reordena la hoja.
 */
export async function registrarEntrega(sesionId: string, lineaId: string, datos: DatosEntrega): Promise<Entrega> {
  const linea = lineaEnCierre(sesionId, lineaId);
  const direccion = datos.tipo === 'DESPACHO' ? direccionValida(datos.direccion) : undefined;

  const actual = entregas.find((e) => e.id === linea.entregaId);
  const compartida = lineas.some((l) => l.id !== linea.id && l.entregaId === actual?.id);
  let entrega: Entrega;
  if (actual && !compartida) {
    entrega = actual;
  } else {
    entrega = { id: nuevoId('e'), sesionId, tipo: datos.tipo };
    entregas.push(entrega);
    linea.entregaId = entrega.id;
  }
  entrega.tipo = datos.tipo;
  if (direccion) {
    entrega.direccion = direccion;
    // Con backend, ms-lives pide a ms-clientas que guarde la dirección en la ficha.
    const clienta = clientas.find((c) => c.id === linea.clientaId);
    if (clienta) clienta.direccion = structuredClone(direccion);
  } else {
    delete entrega.direccion;
  }
  return structuredClone(entrega);
}

/** RF-10: suma la clienta al despacho de otra del mismo live (ej: hermanas). Cada una conserva su línea. */
export async function agruparEntrega(sesionId: string, lineaId: string, entregaId: string): Promise<Entrega> {
  const linea = lineaEnCierre(sesionId, lineaId);
  const entrega = entregas.find((e) => e.id === entregaId && e.sesionId === sesionId);
  if (!entrega) throw new Error('Entrega no encontrada');
  if (entrega.tipo !== 'DESPACHO') throw new Error('Solo se puede agrupar con un despacho.');
  linea.entregaId = entrega.id;
  quitarEntregasVacias(sesionId);
  return structuredClone(entrega);
}

/**
 * RF-11: marca una línea Pendiente como No pagó (noPago = true) o la devuelve a Pendiente (si pagó después).
 * Fija el estado en vez de alternarlo: repetir la llamada (doble toque) no la deshace. Solo En cierre.
 */
export async function marcarNoPago(sesionId: string, lineaId: string, noPago: boolean): Promise<Linea> {
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (sesion?.estado !== 'EN_CIERRE') throw new Error('"No pagó" se marca en el cierre del live.');
  const linea = lineaEditable(sesionId, lineaId);
  if (linea.estadoPago === 'PAGADO') throw new Error('La línea está Pagada.');
  const estado = noPago ? 'NO_PAGO' : 'PENDIENTE';
  if (linea.estadoPago !== estado) registrarPago(linea, estado);
  return structuredClone(linea);
}

/**
 * RF-11: finaliza el cierre. Exige bolsas revisadas, ninguna línea Pendiente y entrega en toda línea Pagada.
 * Con backend, la validación y el cambio de estado van en una transacción.
 */
export async function finalizarCierre(sesionId: string): Promise<Sesion> {
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (sesion?.estado !== 'EN_CIERRE') throw new Error('Solo se finaliza un live En cierre.');
  const delLive = lineas.filter((l) => l.sesionId === sesionId);
  const { faltan } = revisarCierre(delLive, entregas.filter((e) => e.sesionId === sesionId));
  if (faltan.bolsas.length) throw new Error(`Falta revisar ${faltan.bolsas.length} bolsa(s).`);
  if (faltan.pendientes.length) throw new Error(`Hay ${faltan.pendientes.length} línea(s) Pendiente(s): cóbralas o márcalas No pagó.`);
  if (faltan.sinEntrega.length) throw new Error(`Falta la forma de entrega de ${faltan.sinEntrega.length} clienta(s) que pagaron.`);
  sesion.estado = 'CERRADA';
  return structuredClone(sesion);
}

/** RF-11: solo la administradora reabre un live Cerrado; vuelve a En cierre. */
export async function reabrirSesion(sesionId: string): Promise<Sesion> {
  // Simulado: con backend, el rol sale del JWT.
  if (usuarios[0]?.rol !== 'ADMIN') throw new Error('Solo un administrador puede reabrir un live.');
  const sesion = sesiones.find((s) => s.id === sesionId);
  if (sesion?.estado !== 'CERRADA') throw new Error('Solo se reabre un live Cerrado.');
  sesion.estado = 'EN_CIERRE';
  return structuredClone(sesion);
}

/** RF-13: las líneas de una clienta en todos los lives, con su live y su entrega. El más reciente primero. */
export async function historialDeClienta(clientaId: string): Promise<CompraClienta[]> {
  return comprasDe(lineas.filter((l) => l.clientaId === clientaId));
}

/** RF-14: las líneas de todas las clientas, para el ranking y las inactivas (las consulta ms-clientas). */
export async function listarCompras(): Promise<CompraClienta[]> {
  return comprasDe(lineas);
}

function comprasDe(deLineas: Linea[]): CompraClienta[] {
  const historial: CompraClienta[] = [];
  for (const linea of deLineas) {
    const sesion = sesiones.find((s) => s.id === linea.sesionId);
    if (!sesion) continue;
    const entrega = entregas.find((e) => e.id === linea.entregaId);
    historial.push(structuredClone(entrega ? { sesion, linea, entrega } : { sesion, linea }));
  }
  return historial.sort((a, b) => Date.parse(b.sesion.inicio) - Date.parse(a.sesion.inicio));
}
