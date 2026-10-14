import type { Rol, Usuario } from '../types/dominio';
import { CLAVE_SESION, ErrorApi, pedirApi, urlApi } from './api';
import { contrasenas, nuevoId, usuarios } from './mock/datos';

/** Respuesta de POST /api/auth/login (D-31). Se guarda tal cual en el navegador. */
interface RespuestaLogin {
  token: string;
  usuario: Usuario;
}

/** Mismo mensaje para correo, contraseña o usuario desactivado: no dice qué falló (RF-01). */
export const ERROR_CREDENCIALES = 'Correo o contraseña incorrectos.';

function sesionGuardada(): RespuestaLogin | null {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION) ?? 'null') as Partial<RespuestaLogin> | null;
    // Un valor viejo o a medias cuenta como sin sesión.
    return typeof sesion?.token === 'string' && typeof sesion.usuario?.id === 'string' ? (sesion as RespuestaLogin) : null;
  } catch {
    return null;
  }
}

/** RF-01. Con VITE_API_URL va a ms-auth por el gateway; si no, usa los usuarios simulados. */
export async function iniciarSesion(correo: string, contrasena: string): Promise<Usuario> {
  if (urlApi()) {
    try {
      const respuesta = await pedirApi<RespuestaLogin>('/api/auth/login', { metodo: 'POST', cuerpo: { correo, contrasena } });
      if (typeof respuesta?.token !== 'string' || typeof respuesta.usuario?.id !== 'string') {
        throw new Error('El servidor respondió algo inesperado. Intenta de nuevo.');
      }
      localStorage.setItem(CLAVE_SESION, JSON.stringify(respuesta));
      return respuesta.usuario;
    } catch (e) {
      // 401: siempre el mismo mensaje (D-31). Otros errores (429, sin conexión) muestran el suyo.
      throw e instanceof ErrorApi && e.estado === 401 ? new Error(ERROR_CREDENCIALES) : e;
    }
  }
  const usuario = usuarios.find((u) => u.correo === correo.trim().toLowerCase());
  if (!usuario?.activo || contrasenas[usuario.correo] !== contrasena) {
    throw new Error(ERROR_CREDENCIALES);
  }
  const respuesta: RespuestaLogin = { token: `simulado-${usuario.id}`, usuario: structuredClone(usuario) };
  localStorage.setItem(CLAVE_SESION, JSON.stringify(respuesta));
  return respuesta.usuario;
}

/** RF-01: el token se descarta del navegador. */
export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE_SESION);
}

/** Usuario que inició sesión, sin pedir nada a la API. Sirve para proteger rutas y mostrar el nombre. */
export function usuarioDeLaSesion(): Usuario | null {
  return sesionGuardada()?.usuario ?? null;
}

/** Token para el header Authorization: Bearer de las llamadas a la API. */
export function tokenActual(): string | undefined {
  return sesionGuardada()?.token;
}

/**
 * Para los servicios simulados: el usuario de la sesión con sus datos al día, si sigue activo.
 * Con backend sobra: cada microservicio lo saca del JWT.
 */
export function usuarioConectado(): Usuario | undefined {
  // shortcut: con login real, los servicios aún simulados usan el usuario guardado; se borra al conectar ms-lives y ms-clientas.
  if (urlApi()) return usuarioDeLaSesion() ?? undefined;
  const id = usuarioDeLaSesion()?.id;
  return usuarios.find((u) => u.id === id && u.activo);
}

/** Datos al día del usuario de la sesión (el rol puede haber cambiado). Con backend: GET /api/auth/yo (D-33). */
export async function usuarioActual(): Promise<Usuario> {
  let usuario: Usuario | undefined;
  if (urlApi()) {
    // Un 401 (token vencido o usuario desactivado) lo maneja pedirApi: borra la sesión y vuelve al login.
    usuario = await pedirApi<Usuario>('/api/auth/yo', { token: tokenActual() });
  } else {
    usuario = structuredClone(usuarioConectado());
    if (!usuario) throw new Error('No hay una sesión iniciada.');
  }
  // La copia guardada se pone al día: el menú y la pantalla Usuarios la leen (rol o nombre cambiados, D-35).
  const sesion = sesionGuardada();
  if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify({ ...sesion, usuario }));
  return usuario;
}

// RF-03: gestión de usuarios (solo Admin). Mismas reglas y mensajes que ms-auth (D-35).

/** Datos que se editan de un usuario. La contraseña solo se da al crearlo. */
export interface DatosUsuario {
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface NuevoUsuario extends DatosUsuario {
  /** Contraseña inicial: al menos 8 caracteres. */
  contrasena: string;
}

const SIN_PERMISO = 'No tienes permiso para hacer esto.';
const CORREO_REPETIDO = 'Ya existe un usuario con ese correo.';

function exigirAdmin(): Usuario {
  const actual = usuarioConectado();
  if (actual?.rol !== 'ADMIN') throw new Error(SIN_PERMISO);
  return actual;
}

/** Valida y limpia los datos como ms-auth (nombre sin espacios sobrantes, correo en minúsculas, único). */
function datosLimpios(datos: DatosUsuario, excluirId?: string): DatosUsuario {
  const nombre = datos.nombre.trim();
  const correo = datos.correo.trim().toLowerCase();
  if (!nombre) throw new Error('Ingresa el nombre.');
  if (!/^[^\s@]+@[^\s@]+$/.test(correo)) throw new Error('Ingresa un correo válido.');
  if (usuarios.some((u) => u.correo === correo && u.id !== excluirId)) throw new Error(CORREO_REPETIDO);
  return { nombre, correo, rol: datos.rol };
}

function buscarUsuario(id: string): Usuario {
  const usuario = usuarios.find((u) => u.id === id);
  if (!usuario) throw new Error('El usuario no existe.');
  return usuario;
}

/** RF-03: todos los usuarios, por nombre. */
export async function listarUsuarios(): Promise<Usuario[]> {
  if (urlApi()) return pedirApi<Usuario[]>('/api/usuarios', { token: tokenActual() });
  exigirAdmin();
  return structuredClone([...usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
}

/** RF-03: crea un usuario activo con su contraseña inicial. Un correo repetido se rechaza. */
export async function crearUsuario(datos: NuevoUsuario): Promise<Usuario> {
  if (urlApi()) return pedirApi<Usuario>('/api/usuarios', { metodo: 'POST', cuerpo: datos, token: tokenActual() });
  exigirAdmin();
  const limpios = datosLimpios(datos);
  if (datos.contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (new TextEncoder().encode(datos.contrasena).length > 72) throw new Error('La contraseña es demasiado larga (máximo 72 caracteres).');
  const usuario: Usuario = { id: nuevoId('u'), ...limpios, activo: true };
  usuarios.push(usuario);
  contrasenas[usuario.correo] = datos.contrasena;
  return structuredClone(usuario);
}

/** RF-03: edita nombre, correo y rol. Nadie se cambia su propio rol (D-35). */
export async function editarUsuario(id: string, datos: DatosUsuario): Promise<Usuario> {
  if (urlApi()) return pedirApi<Usuario>(`/api/usuarios/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos, token: tokenActual() });
  const actual = exigirAdmin();
  const usuario = buscarUsuario(id);
  const limpios = datosLimpios(datos, id);
  if (id === actual.id && limpios.rol !== usuario.rol) throw new Error('No puedes cambiar tu propio rol.');
  if (limpios.correo !== usuario.correo) {
    // En el mock la contraseña va por correo: se mueve con él.
    contrasenas[limpios.correo] = contrasenas[usuario.correo]!;
    delete contrasenas[usuario.correo];
  }
  Object.assign(usuario, limpios);
  return structuredClone(usuario);
}

/** RF-03: desactivar (baja lógica) o reactivar. Nadie se desactiva a sí mismo (D-35). */
export async function cambiarActivoUsuario(id: string, activo: boolean): Promise<Usuario> {
  if (urlApi()) {
    return pedirApi<Usuario>(`/api/usuarios/${encodeURIComponent(id)}/activo`, { metodo: 'PATCH', cuerpo: { activo }, token: tokenActual() });
  }
  const actual = exigirAdmin();
  const usuario = buscarUsuario(id);
  if (id === actual.id && !activo) throw new Error('No puedes desactivar tu propia cuenta.');
  usuario.activo = activo;
  return structuredClone(usuario);
}
