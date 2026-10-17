import type { Clienta, Direccion } from '../types/dominio';
import {
  clientasInactivas,
  duplicadosDe,
  normalizarDireccion,
  normalizarTiktok,
  rankingDeClientas,
  type ClientaInactiva,
  type CriterioRanking,
  type Duplicados,
  type PosicionRanking,
} from '../utils/clientas';
import { clientas, configuracion, lineas, nuevoId } from './mock/datos';
import { urlApi } from './api';
import { pedirConSesion, usuarioConectado } from './usuariosService';
import { listarCompras } from './sesionesService';

// Con VITE_API_URL, las fichas y los días de inactividad vienen de ms-clientas por el gateway (D-36, D-38);
// sin ella, datos simulados en memoria. Ranking e inactivas se calculan aquí con los datos de la API (paso 7):
//   GET   /api/clientas                    listarClientas
//   GET   /api/clientas/{id}               obtenerClienta
//   POST  /api/clientas                    crearClienta
//   PUT   /api/clientas/{id}               actualizarClienta
//   GET   /api/clientas/duplicados?...     buscarDuplicados
//   PATCH /api/clientas/{id}/activa        cambiarActiva
//   GET   /api/configuracion/dias-inactividad   obtenerDiasInactividad
//   PUT   /api/configuracion/dias-inactividad   cambiarDiasInactividad

export async function listarClientas(): Promise<Clienta[]> {
  if (urlApi()) return pedirConSesion('/api/clientas');
  return structuredClone(clientas);
}

export async function obtenerClienta(id: string): Promise<Clienta> {
  if (urlApi()) return pedirConSesion(`/api/clientas/${encodeURIComponent(id)}`);
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
  if (urlApi()) return pedirConSesion('/api/clientas', { metodo: 'POST', cuerpo: datos });
  const clienta: Clienta = { id: nuevoId('c'), ...datosValidos(datos), activa: true };
  clientas.push(clienta);
  return structuredClone(clienta);
}

/**
 * RF-12: edita los datos de una clienta. Un campo vacío se borra.
 * Al renombrar, actualiza la copia del nombre en todas sus líneas (D-03, D-28).
 */
export async function actualizarClienta(id: string, datos: DatosClienta): Promise<Clienta> {
  if (urlApi()) return pedirConSesion(`/api/clientas/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos });
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
  if (urlApi()) {
    const consulta = new URLSearchParams({ usuarioTiktok: datos.usuarioTiktok ?? '', telefono: datos.telefono ?? '', excluirId: excluirId ?? '' });
    return pedirConSesion(`/api/clientas/duplicados?${consulta}`);
  }
  return structuredClone(duplicadosDe(datos, clientas, excluirId));
}

/** RF-12: baja lógica o reactivación. Solo la administradora (D-28); conserva el historial. */
export async function cambiarActiva(id: string, activa: boolean): Promise<Clienta> {
  if (urlApi()) return pedirConSesion(`/api/clientas/${encodeURIComponent(id)}/activa`, { metodo: 'PATCH', cuerpo: { activa } });
  if (usuarioConectado()?.rol !== 'ADMIN') throw new Error('Solo un administrador puede desactivar o reactivar clientas.');
  const clienta = buscar(id);
  clienta.activa = activa;
  return structuredClone(clienta);
}

/** RF-14: ranking en un rango de días "aaaa-mm-dd". Con backend, ms-clientas pide las líneas a ms-lives. */
export async function rankingClientas(
  criterio: CriterioRanking,
  rango: { desde: string; hasta: string },
): Promise<PosicionRanking[]> {
  const [todas, compras] = await Promise.all([listarClientas(), listarCompras()]);
  return structuredClone(rankingDeClientas(todas, compras, criterio, rango));
}

/** RF-14: clientas inactivas según los días configurados, contados hasta hoy. */
export async function listarInactivas(): Promise<ClientaInactiva[]> {
  // shortcut: con la API se calcula aquí con todas las fichas y compras; el paso 7 lo pasa a ms-clientas.
  const [todas, compras, dias] = await Promise.all([listarClientas(), listarCompras(), obtenerDiasInactividad()]);
  return structuredClone(clientasInactivas(todas, compras, new Date(), dias));
}

export async function obtenerDiasInactividad(): Promise<number> {
  if (urlApi()) return (await pedirConSesion<{ dias: number }>('/api/configuracion/dias-inactividad')).dias;
  return configuracion.diasInactividad;
}

/** RF-14: solo la administradora cambia los días sin comprar que definen a una inactiva (1 a 365). */
export async function cambiarDiasInactividad(dias: number): Promise<number> {
  if (urlApi()) {
    return (await pedirConSesion<{ dias: number }>('/api/configuracion/dias-inactividad', { metodo: 'PUT', cuerpo: { dias } })).dias;
  }
  // Simulado: con backend, el rol sale del JWT.
  if (usuarioConectado()?.rol !== 'ADMIN') throw new Error('Solo un administrador puede cambiar los días de inactividad.');
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new Error('Los días deben ser un número entero entre 1 y 365.');
  configuracion.diasInactividad = dias;
  return dias;
}
