import { describe, expect, it } from 'vitest';
import { sesiones } from './mock/datos';
import { abrirSesion, historialDeClienta, listarSesiones } from './sesionesService';

describe('listarSesiones (RF-04)', () => {
  it('trae cada live con su número de clientas, total y total pagado', async () => {
    const lista = await listarSesiones();

    // Live martes: 17.000 + 10.000 + 13.000 (pagado) + 8.000 (el 7 cancelado no suma) + 10.000
    expect(lista.find((s) => s.id === 's-2')).toMatchObject({ clientas: 5, total: 58000, totalPagado: 13000 });
    // Live jueves: Javiera 12.000 y Valentina 4.000 pagadas; Gabriela 9.000 no pagó
    expect(lista.find((s) => s.id === 's-1')).toMatchObject({ clientas: 3, total: 25000, totalPagado: 16000 });
  });
});

describe('abrirSesion (RF-04)', () => {
  it('no abre otro live si ya hay uno Abierto', async () => {
    const antes = await listarSesiones();
    await expect(abrirSesion('Otro live')).rejects.toThrow('Ya hay un live abierto');
    expect(await listarSesiones()).toEqual(antes);
  });

  it('abre un live con nombre, Abierto, sin clientas y con la hora actual', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE'; // un live En cierre no bloquea

    const antes = Date.now();
    const nueva = await abrirSesion('  Live viernes  ');

    expect(nueva).toMatchObject({ nombre: 'Live viernes', estado: 'ABIERTA' });
    expect(Date.parse(nueva.inicio)).toBeGreaterThanOrEqual(antes - 1000);
    expect((await listarSesiones()).find((s) => s.id === nueva.id)).toMatchObject({
      clientas: 0,
      total: 0,
      totalPagado: 0,
    });
  });

  it('el nombre es opcional', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'CERRADA';

    expect((await abrirSesion()).nombre).toBeUndefined();
    sesiones.find((s) => s.estado === 'ABIERTA')!.estado = 'CERRADA';
    expect((await abrirSesion('   ')).nombre).toBeUndefined();
  });
});

describe('historialDeClienta (RF-13)', () => {
  it('devuelve sus líneas con el live y la entrega, el live más reciente primero', async () => {
    const historial = await historialDeClienta('c-3'); // Javiera: s-1 Cerrado (despacho e-1) y s-2 Abierto (retiro e-2)
    expect(historial.map((c) => [c.sesion.id, c.linea.id, c.entrega?.tipo])).toEqual([
      ['s-2', 'l-6', 'RETIRO'],
      ['s-1', 'l-1', 'DESPACHO'],
    ]);
  });

  it('sin entrega no trae entrega, y una clienta sin líneas tiene historial vacío', async () => {
    const [enCurso] = await historialDeClienta('c-1');
    expect(enCurso?.entrega).toBeUndefined();
    expect(await historialDeClienta('c-sin-lineas')).toEqual([]);
  });
});
