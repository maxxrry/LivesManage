import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clienta, CompraClienta } from '../types/dominio';
import { clientasInactivas } from '../utils/clientas';
import { listarInactivas } from './clientasService';
import { anotar, deshacerAnotacion, finalizarCierre, registrarEntrega } from './sesionesService';
import { cerrarSesion } from './usuariosService';

function respuesta(estado: number, cuerpo?: unknown) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Con VITE_API_URL, lives y clientas van a ms-lives y ms-clientas por el gateway (D-38). */
describe('lives y clientas con el backend', () => {
  const fetchFalso = vi.fn<typeof fetch>();
  const llamada = (i: number) => {
    const [url, opciones] = fetchFalso.mock.calls[i] ?? [];
    return { url, metodo: opciones?.method ?? 'GET', cuerpo: opciones?.body ? JSON.parse(opciones.body as string) : undefined, opciones };
  };

  beforeEach(() => {
    cerrarSesion();
    localStorage.setItem('livesmanage.sesion', JSON.stringify({ token: 'jwt', usuario: { id: 'u-1', nombre: 'A', correo: 'a@b.cl', rol: 'ADMIN', activo: true } }));
    vi.stubEnv('VITE_API_URL', 'http://gateway');
    vi.stubGlobal('fetch', fetchFalso);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchFalso.mockReset();
  });

  it('anotar y deshacer usan las rutas del live, con el token', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(201, { anotacionId: 'a-1', linea: {} }));
    fetchFalso.mockResolvedValueOnce(respuesta(204));

    await anotar('s 1', { nuevaClienta: 'ana' }, [5000]);
    await deshacerAnotacion('s 1', 'a-1');

    expect(llamada(0)).toMatchObject({ url: 'http://gateway/api/lives/s%201/anotaciones', metodo: 'POST', cuerpo: { destino: { nuevaClienta: 'ana' }, precios: [5000] } });
    expect(llamada(0).opciones?.headers).toMatchObject({ Authorization: 'Bearer jwt' });
    expect(llamada(1)).toMatchObject({ url: 'http://gateway/api/lives/s%201/anotaciones/a-1', metodo: 'DELETE' });
  });

  it('el despacho manda la dirección y finalizar muestra lo que falta según el backend', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(200, { id: 'e-1', sesionId: 's-1', tipo: 'DESPACHO' }));
    fetchFalso.mockResolvedValueOnce(respuesta(409, { mensaje: 'Falta revisar 2 bolsa(s).' }));
    const direccion = { calle: 'Los Aromos 1234', comuna: 'Maipú', region: 'Metropolitana' };

    await registrarEntrega('s-1', 'l-1', { tipo: 'DESPACHO', direccion });
    await expect(finalizarCierre('s-1')).rejects.toThrow('Falta revisar 2 bolsa(s).');

    expect(llamada(0)).toMatchObject({ url: 'http://gateway/api/lives/s-1/lineas/l-1/entrega', metodo: 'PUT', cuerpo: { tipo: 'DESPACHO', direccion } });
    expect(llamada(1)).toMatchObject({ url: 'http://gateway/api/lives/s-1/finalizar', metodo: 'POST' });
  });

  it('las inactivas se calculan con las fichas, las compras y los días de la API', async () => {
    const clientas: Clienta[] = [{ id: 'c-1', nombre: 'Flo', activa: true }];
    const compras: CompraClienta[] = [];
    fetchFalso.mockImplementation(async (url) => {
      if (String(url).endsWith('/api/clientas')) return respuesta(200, clientas);
      if (String(url).endsWith('/api/lives/lineas')) return respuesta(200, compras);
      return respuesta(200, { dias: 30 });
    });

    expect(await listarInactivas()).toEqual(clientasInactivas(clientas, compras, new Date(), 30));
    expect(fetchFalso.mock.calls.map(([url]) => url)).toContain('http://gateway/api/configuracion/dias-inactividad');
  });
});
