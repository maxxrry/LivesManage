import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usuario } from '../types/dominio';
import { cerrarSesion, ERROR_CREDENCIALES, iniciarSesion, tokenActual, usuarioActual, usuarioDeLaSesion } from './usuariosService';

const ADMIN: Usuario = { id: 'uuid-1', nombre: 'Administradora', correo: 'admin@livesmanage.cl', rol: 'ADMIN', activo: true };

function respuesta(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}

describe('sesión con el backend (RF-01, D-34)', () => {
  const fetchFalso = vi.fn<typeof fetch>();

  beforeEach(() => {
    cerrarSesion();
    vi.stubEnv('VITE_API_URL', 'http://gateway');
    vi.stubGlobal('fetch', fetchFalso);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchFalso.mockReset();
  });

  it('el login va al gateway y guarda token y usuario', async () => {
    fetchFalso.mockResolvedValue(respuesta(200, { token: 'jwt', usuario: ADMIN }));

    const usuario = await iniciarSesion('admin@livesmanage.cl', 'clave');

    expect(usuario).toEqual(ADMIN);
    expect(tokenActual()).toBe('jwt');
    const [url, opciones] = fetchFalso.mock.calls[0] ?? [];
    expect(url).toBe('http://gateway/api/auth/login');
    expect(opciones?.method).toBe('POST');
    expect(JSON.parse(opciones?.body as string)).toEqual({ correo: 'admin@livesmanage.cl', contrasena: 'clave' });
  });

  it('un 401 muestra el mensaje genérico y no deja sesión', async () => {
    fetchFalso.mockResolvedValue(respuesta(401, { mensaje: 'otro texto' }));

    await expect(iniciarSesion('admin@livesmanage.cl', 'mala')).rejects.toThrow(ERROR_CREDENCIALES);
    expect(usuarioDeLaSesion()).toBeNull();
  });

  it('demasiados intentos (429) muestra el mensaje del gateway', async () => {
    fetchFalso.mockResolvedValue(respuesta(429, { mensaje: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' }));

    await expect(iniciarSesion('admin@livesmanage.cl', 'x')).rejects.toThrow('Demasiados intentos');
  });

  it('sin conexión avisa que no se pudo conectar', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(iniciarSesion('admin@livesmanage.cl', 'x')).rejects.toThrow('No se pudo conectar con el servidor');
  });

  it.each([
    ['sin usuario', respuesta(200, { token: 't' })],
    ['HTML en vez de JSON', new Response('<!doctype html>', { status: 200 })],
  ])('una respuesta 200 inesperada (%s) muestra un error y no deja sesión', async (_caso, r) => {
    fetchFalso.mockResolvedValue(r);

    await expect(iniciarSesion('admin@livesmanage.cl', 'clave')).rejects.toThrow('El servidor respondió algo inesperado');
    expect(usuarioDeLaSesion()).toBeNull();
  });

  it('usuarioActual pide /api/auth/yo con el token', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(200, { token: 'jwt', usuario: ADMIN }));
    await iniciarSesion('admin@livesmanage.cl', 'clave');
    fetchFalso.mockResolvedValueOnce(respuesta(200, { ...ADMIN, rol: 'VENDEDOR' }));

    expect((await usuarioActual()).rol).toBe('VENDEDOR');
    const [url, opciones] = fetchFalso.mock.calls[1] ?? [];
    expect(url).toBe('http://gateway/api/auth/yo');
    expect(opciones?.headers).toMatchObject({ Authorization: 'Bearer jwt' });
  });

  it('con el token vencido (401) descarta la sesión', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(200, { token: 'jwt', usuario: ADMIN }));
    await iniciarSesion('admin@livesmanage.cl', 'clave');
    fetchFalso.mockResolvedValueOnce(respuesta(401, { mensaje: 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.' }));

    await expect(usuarioActual()).rejects.toThrow('Tu sesión expiró');
    expect(usuarioDeLaSesion()).toBeNull(); // la vuelta al login la avisa jsdom como "Not implemented: navigation"
  });
});
