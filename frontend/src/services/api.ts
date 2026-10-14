/**
 * Cliente HTTP del api-gateway (D-34). Solo lo usan los servicios de esta carpeta.
 * Sin VITE_API_URL, los servicios siguen con los datos simulados de ./mock.
 */

/** Clave de localStorage donde vive la sesión (D-31). */
export const CLAVE_SESION = 'livesmanage.sesion';

/** URL del gateway (ej: http://localhost:8080). Vacía = datos simulados. */
export function urlApi(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

/** Error de la API con su código HTTP y el `mensaje` que manda el backend (D-33), listo para mostrar. */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export async function pedirApi<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; token?: string } = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${urlApi()}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        ...(opciones.cuerpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(opciones.token && { Authorization: `Bearer ${opciones.token}` }),
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
  }
  // Token vencido, alterado o de un usuario desactivado: se descarta la sesión y se vuelve al login (D-31, D-34).
  if (respuesta.status === 401 && opciones.token) {
    localStorage.removeItem(CLAVE_SESION);
    window.location.assign(`${import.meta.env.BASE_URL}login`);
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as { mensaje?: string } | null;
    throw new ErrorApi(respuesta.status, cuerpo?.mensaje ?? 'Ocurrió un error inesperado. Intenta de nuevo.');
  }
  if (respuesta.status === 204) return undefined as T;
  try {
    return (await respuesta.json()) as T;
  } catch {
    throw new ErrorApi(respuesta.status, 'El servidor respondió algo inesperado. Intenta de nuevo.');
  }
}
