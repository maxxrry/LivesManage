import type { Usuario } from '../types/dominio';
import { CLAVE_SESION, ErrorApi, pedirApi, urlApi } from './api';
import { contrasenas, usuarios } from './mock/datos';

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
  if (urlApi()) {
    // Un 401 (token vencido o usuario desactivado) lo maneja pedirApi: borra la sesión y vuelve al login.
    return pedirApi<Usuario>('/api/auth/yo', { token: tokenActual() });
  }
  const usuario = usuarioConectado();
  if (!usuario) {
    throw new Error('No hay una sesión iniciada.');
  }
  return structuredClone(usuario);
}
