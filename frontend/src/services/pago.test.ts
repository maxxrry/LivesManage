import { describe, expect, it } from 'vitest';
import { lineas, sesiones } from './mock/datos';
import { alternarPago, alternarPrenda, anotar, deshacerAnotacion, listarSesiones, obtenerSesion } from './sesionesService';

// Datos simulados: live Abierto s-2. l-4 = Gabriela 6-6-5 ($17.000, Pendiente),
// l-6 = Javiera 8-5 ($13.000, Pagado). Total pagado del live: $13.000.
const totalPagado = async () => (await listarSesiones()).find((s) => s.id === 's-2')!.totalPagado;
const linea = async (id: string) => (await obtenerSesion('s-2')).lineas.find((l) => l.id === id)!;

describe('alternarPago (RF-07)', () => {
  it('marcar Pagada una línea de $17.000 sube el total pagado en $17.000', async () => {
    expect(await totalPagado()).toBe(13000);

    const pagada = await alternarPago('s-2', 'l-4');

    expect(pagada.estadoPago).toBe('PAGADO');
    expect(await totalPagado()).toBe(30000);
  });

  it('otro toque la vuelve a Pendiente y el total pagado baja', async () => {
    await alternarPago('s-2', 'l-4');
    const pendiente = await alternarPago('s-2', 'l-4');

    expect(pendiente.estadoPago).toBe('PENDIENTE');
    expect(await totalPagado()).toBe(13000);
  });

  it('registra fecha, hora y usuario del cambio', async () => {
    const antes = Date.now();
    const pagada = await alternarPago('s-2', 'l-4');

    expect(pagada.pagoActualizado?.usuarioId).toBe('u-1');
    expect(Date.parse(pagada.pagoActualizado!.fecha)).toBeGreaterThanOrEqual(antes - 1000);
  });

  it('no reordena la hoja (D-21)', async () => {
    const antes = (await linea('l-4')).actualizada;
    await alternarPago('s-2', 'l-4');
    expect((await linea('l-4')).actualizada).toBe(antes);
  });

  it('funciona En cierre, pero no en un live Cerrado', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    expect((await alternarPago('s-2', 'l-4')).estadoPago).toBe('PAGADO');

    await expect(alternarPago('s-1', 'l-1')).rejects.toThrow('cerrado');
    expect(lineas.find((l) => l.id === 'l-1')!.estadoPago).toBe('PAGADO');
  });
});

describe('cambios de monto en una línea Pagada (D-20)', () => {
  it('anotar una prenda más la vuelve a Pendiente y registra el cambio', async () => {
    const { linea: javiera } = await anotar('s-2', { clientaId: 'c-3' }, [5000]);

    expect(javiera.estadoPago).toBe('PENDIENTE');
    expect(javiera.pagoActualizado?.usuarioId).toBe('u-1');
    expect(await totalPagado()).toBe(0);
  });

  it('deshacer esa anotación la deja Pagada otra vez, como estaba', async () => {
    const antes = await linea('l-6');
    const { anotacionId } = await anotar('s-2', { clientaId: 'c-3' }, [5000]);

    await deshacerAnotacion(anotacionId);

    expect(await linea('l-6')).toEqual(antes);
  });

  it('si la línea cambió después de anotar, ya no se puede deshacer (D-22)', async () => {
    // Javiera (Pagado) con una prenda cancelada; se anota "javi 5" y luego se restaura la cancelada.
    const prenda = (await linea('l-6')).prendas[0]!;
    await alternarPrenda('s-2', 'l-6', prenda.id);
    const { anotacionId } = await anotar('s-2', { clientaId: 'c-3' }, [5000]);
    await alternarPrenda('s-2', 'l-6', prenda.id);

    await expect(deshacerAnotacion(anotacionId)).rejects.toThrow('ya no se puede deshacer');
    expect((await linea('l-6')).estadoPago).toBe('PENDIENTE');
  });

  it('marcar el pago después de anotar también anula el deshacer (D-22)', async () => {
    const { anotacionId } = await anotar('s-2', { clientaId: 'c-3' }, [5000]);
    await alternarPago('s-2', 'l-6');
    await alternarPago('s-2', 'l-6');

    await expect(deshacerAnotacion(anotacionId)).rejects.toThrow('ya no se puede deshacer');
  });

  it('restaurar una prenda cancelada la vuelve a Pendiente', async () => {
    const prenda = (await linea('l-6')).prendas[0]!;
    await alternarPrenda('s-2', 'l-6', prenda.id); // cancelar: sigue Pagado
    const restaurada = await alternarPrenda('s-2', 'l-6', prenda.id);

    expect(restaurada.estadoPago).toBe('PENDIENTE');
  });

  it('cancelar una prenda la deja Pagada', async () => {
    const prenda = (await linea('l-6')).prendas[0]!;
    const cancelada = await alternarPrenda('s-2', 'l-6', prenda.id);

    expect(cancelada.estadoPago).toBe('PAGADO');
  });
});
