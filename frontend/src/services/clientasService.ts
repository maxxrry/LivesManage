import type { Clienta, Direccion } from '../types/dominio';
import { duplicadosDe, normalizarDireccion, normalizarTiktok, type Duplicados } from '../utils/clientas';
import { clientas, lineas, nuevoId, usuarios } from './mock/datos';

// Simulado en memoria. Con backend (ms-clientas):
//   GET   /api/clientas                    listarClientas
//   GET   /api/clientas/{id}               obtenerClienta
//   POST  /api/clientas                    crearClienta
//   PUT   /api/clientas/{id}               actualizarClienta
//   GET   /api/clientas/duplicados?...     buscarDuplicados
//   PATCH /api/clientas/{id}/activa        cambiarActiva

export async function listarClientas(): Promise<Clienta[]> {
  return structuredClone(clientas);
}

export async function obtenerClienta(id: string): Promise<Clienta> {
  return structuredClone(buscar(id));
}

function buscar(id: string): Clienta {
  const clienta = clientas.find((c) => c.id === id);
  if (!clienta) throw new Error('Clienta no encontrada');
  return clienta;
}

/** Datos que se registran o editan de una clienta (RF-12). Solo el nombre es obligatorio. */
export interface DatosClienta {
  nombre: string;
  usuarioTiktok?: string;
  telefono?: string;
  direccion?: Direccion;
}

/** Valida y limpia los datos: los campos vacíos no se guardan (D-28). */
function datosValidos(datos: DatosClienta): Omit<Clienta, 'id' | 'activa' | 'ultimaCompra'> {
  const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
  if (!nombre) throw new Error('Falta el nombre de la clienta.');
  const limpios: Omit<Clienta, 'id' | 'activa' | 'ultimaCompra'> = { nombre };
  const usuarioTiktok = normalizarTiktok(datos.usuarioTiktok ?? '');
  const telefono = datos.telefono?.trim();
  if (usuarioTiktok) limpios.usuarioTiktok = usuarioTiktok;
  if (telefono) limpios.telefono = telefono;
  if (datos.direccion) limpios.direccion = normalizarDireccion(datos.direccion);
  return limpios;
}

/** RF-12: registra una clienta. Un duplicado no bloquea: la pantalla avisa antes (D-28). */
export async function crearClienta(datos: DatosClienta): Promise<Clienta> {
  const clienta: Clienta = { id: nuevoId('c'), ...datosValidos(datos), activa: true };
  clientas.push(clienta);
  return structuredClone(clienta);
}

/**
 * RF-12: edita los datos de una clienta. Un campo vacío se borra.
 * Al renombrar, actualiza la copia del nombre en todas sus líneas (D-03, D-28).
 */
export async function actualizarClienta(id: string, datos: DatosClienta): Promise<Clienta> {
  const clienta = buscar(id);
  const nuevos = datosValidos(datos);
  delete clienta.usuarioTiktok;
  delete clienta.telefono;
  delete clienta.direccion;
  Object.assign(clienta, nuevos);
  for (const linea of lineas) {
    if (linea.clientaId === id) linea.clientaNombre = clienta.nombre;
  }
  return structuredClone(clienta);
}

/** RF-12: otra clienta con el mismo usuario de TikTok o teléfono. */
export async function buscarDuplicados(
  datos: Pick<DatosClienta, 'usuarioTiktok' | 'telefono'>,
  excluirId?: string,
): Promise<Duplicados> {
  return structuredClone(duplicadosDe(datos, clientas, excluirId));
}

/** RF-12: baja lógica o reactivación. Solo la administradora (D-28); conserva el historial. */
export async function cambiarActiva(id: string, activa: boolean): Promise<Clienta> {
  if (usuarios[0]?.rol !== 'ADMIN') throw new Error('Solo un administrador puede desactivar o reactivar clientas.');
  const clienta = buscar(id);
  clienta.activa = activa;
  return structuredClone(clienta);
}
