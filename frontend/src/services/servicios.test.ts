import { describe, expect, it } from 'vitest';
import { listarSesiones, obtenerSesion } from './sesionesService';
import { usuarioActual } from './usuariosService';

describe('servicios simulados', () => {
  it('tienen un solo live Abierto con 5 líneas en CLP enteros', async () => {
    const abiertas = (await listarSesiones()).filter((s) => s.estado === 'ABIERTA');
    expect(abiertas).toHaveLength(1);

    const { lineas } = await obtenerSesion(abiertas[0]!.id);
    expect(lineas).toHaveLength(5);
    const gabriela = lineas.find((l) => l.clientaNombre === 'Gabriela Peña');
    expect(gabriela?.prendas.map((p) => p.precio)).toEqual([6000, 6000, 5000]);
    for (const precio of lineas.flatMap((l) => l.prendas.map((p) => p.precio))) {
      expect(Number.isInteger(precio)).toBe(true);
    }
  });

  it('devuelven copias: modificar el resultado no altera los datos', async () => {
    const primera = await obtenerSesion('s-2');
    primera.lineas[0]!.estadoPago = 'PAGADO';
    const segunda = await obtenerSesion('s-2');
    expect(segunda.lineas[0]!.estadoPago).toBe('PENDIENTE');
  });

  it('el usuario simulado es ADMIN', async () => {
    expect((await usuarioActual()).rol).toBe('ADMIN');
  });
});
