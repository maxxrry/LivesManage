import { describe, expect, it } from 'vitest';
import { totalLinea } from '../utils/montos';
import { listarClientas } from './clientasService';
import { lineas, sesiones } from './mock/datos';
import { alternarPrenda, anotar, cambiarClienta, deshacerAnotacion, listarSesiones, obtenerSesion } from './sesionesService';

// Datos simulados: live Abierto s-2. l-4 = Gabriela 6-6-5, l-5 = Florencia 6-4,
// l-6 = Javiera 8-5 (Pagado, entrega e-2), l-7 = Camila 5-7(cancelada)-3.
const totalDelLive = async () => (await listarSesiones()).find((s) => s.id === 's-2')!.total;
const linea = async (id: string) => (await obtenerSesion('s-2')).lineas.find((l) => l.id === id);

describe('alternarPrenda (RF-06)', () => {
  it('cancelar una prenda de $6.000 baja la línea y el total del live en $6.000; restaurarla los repone', async () => {
    const gabriela = (await linea('l-4'))!;
    const prenda = gabriela.prendas[0]!;
    expect(totalLinea(gabriela.prendas)).toBe(17000);
    expect(await totalDelLive()).toBe(58000);

    const cancelada = await alternarPrenda('s-2', 'l-4', prenda.id);
    expect(cancelada.prendas[0]!.estado).toBe('CANCELADA');
    expect(totalLinea(cancelada.prendas)).toBe(11000);
    expect(await totalDelLive()).toBe(52000);

    const restaurada = await alternarPrenda('s-2', 'l-4', prenda.id);
    expect(restaurada.prendas[0]!.estado).toBe('VIGENTE');
    expect(totalLinea(restaurada.prendas)).toBe(17000);
    expect(await totalDelLive()).toBe(58000);
  });

  it('la prenda nunca se borra', async () => {
    const prenda = (await linea('l-4'))!.prendas[0]!;
    const cancelada = await alternarPrenda('s-2', 'l-4', prenda.id);
    expect(cancelada.prendas).toHaveLength(3);
  });

  it('no cambia el orden de la hoja (D-18)', async () => {
    const antes = (await linea('l-4'))!.actualizada;
    await alternarPrenda('s-2', 'l-4', (await linea('l-4'))!.prendas[0]!.id);
    expect((await linea('l-4'))!.actualizada).toBe(antes);
  });

  it('funciona En cierre, pero no en un live Cerrado', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    await expect(alternarPrenda('s-2', 'l-4', (await linea('l-4'))!.prendas[0]!.id)).resolves.toBeDefined();

    const prendaCerrada = lineas.find((l) => l.id === 'l-1')!.prendas[0]!;
    await expect(alternarPrenda('s-1', 'l-1', prendaCerrada.id)).rejects.toThrow('cerrado');
    expect(prendaCerrada.estado).toBe('VIGENTE');
  });

  it('rechaza una prenda que no es de esa línea', async () => {
    const deFlorencia = (await linea('l-5'))!.prendas[0]!;
    await expect(alternarPrenda('s-2', 'l-4', deFlorencia.id)).rejects.toThrow();
  });
});

describe('cambiarClienta (RF-06)', () => {
  it('cambia la clienta de la línea si la nueva no tiene línea en el live', async () => {
    const resultado = await cambiarClienta('s-2', 'l-4', { clientaId: 'c-6' });

    expect(resultado).toMatchObject({ id: 'l-4', clientaId: 'c-6', clientaNombre: 'Valentina Soto' });
    expect(totalLinea(resultado.prendas)).toBe(17000);
    expect(await totalDelLive()).toBe(58000);
  });

  it('cambia a una clienta nueva', async () => {
    const resultado = await cambiarClienta('s-2', 'l-4', { nuevaClienta: 'Gabi P.' });

    expect(resultado.clientaNombre).toBe('Gabi P.');
    expect((await listarClientas()).map((c) => c.nombre)).toContain('Gabi P.');
  });

  it('si la nueva clienta ya tiene línea, une ambas líneas', async () => {
    // Gabriela (6-6-5) se cambia a Florencia, que ya tiene 6-4.
    const resultado = await cambiarClienta('s-2', 'l-4', { clientaId: 'c-2' });

    expect(resultado.id).toBe('l-5');
    expect(resultado.prendas.map((p) => p.precio)).toEqual([6000, 4000, 6000, 6000, 5000]);
    const { lineas: hoja } = await obtenerSesion('s-2');
    expect(hoja.find((l) => l.id === 'l-4')).toBeUndefined();
    expect(hoja).toHaveLength(4);
    expect(await totalDelLive()).toBe(58000);
  });

  it('al unir, queda Pagado solo si ambas lo estaban, y conserva la entrega (D-19)', async () => {
    // Florencia (Pendiente) pasa a Javiera (Pagado, con entrega e-2).
    const resultado = await cambiarClienta('s-2', 'l-5', { clientaId: 'c-3' });
    expect(resultado).toMatchObject({ id: 'l-6', estadoPago: 'PENDIENTE', entregaId: 'e-2' });
  });

  it('al unir, la bolsa queda revisada solo si ambas lo estaban (D-19)', async () => {
    lineas.find((l) => l.id === 'l-4')!.bolsaRevisada = true;
    lineas.find((l) => l.id === 'l-5')!.bolsaRevisada = false;
    expect((await cambiarClienta('s-2', 'l-4', { clientaId: 'c-2' })).bolsaRevisada).toBe(false);
  });

  it('elegir la misma clienta no cambia nada', async () => {
    const antes = await obtenerSesion('s-2');
    await cambiarClienta('s-2', 'l-4', { clientaId: 'c-1' });
    expect(await obtenerSesion('s-2')).toEqual(antes);
  });

  it('no cambia nada en un live Cerrado', async () => {
    await expect(cambiarClienta('s-1', 'l-1', { clientaId: 'c-2' })).rejects.toThrow('cerrado');
  });

  it('después de cambiar la clienta, la última anotación ya no se puede deshacer (D-19)', async () => {
    const { anotacionId } = await anotar('s-2', { clientaId: 'c-1' }, [3000]);
    await cambiarClienta('s-2', 'l-4', { clientaId: 'c-6' });
    await expect(deshacerAnotacion(anotacionId)).rejects.toThrow('ya no se puede deshacer');
  });
});
