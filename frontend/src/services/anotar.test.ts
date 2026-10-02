import { describe, expect, it } from 'vitest';
import { listarClientas } from './clientasService';
import { anotar, deshacerAnotacion, obtenerSesion } from './sesionesService';

// s-2 es el live Abierto de los datos simulados; s-1 está Cerrado.
const lineaDe = async (clientaNombre: string) =>
  (await obtenerSesion('s-2')).lineas.find((l) => l.clientaNombre === clientaNombre);

const precios = (linea: Awaited<ReturnType<typeof lineaDe>>) => linea?.prendas.map((p) => p.precio);

describe('anotar (RF-05)', () => {
  it('suma las prendas a la línea existente de la clienta', async () => {
    const antes = await obtenerSesion('s-2');

    const { linea } = await anotar('s-2', { clientaId: 'c-2' }, [6000, 4000]);

    expect(precios(linea)).toEqual([6000, 4000, 6000, 4000]);
    const despues = await obtenerSesion('s-2');
    expect(despues.lineas).toHaveLength(antes.lineas.length);
    expect(precios(await lineaDe('Florencia Ruiz'))).toEqual([6000, 4000, 6000, 4000]);
  });

  it('crea clienta y línea Pendiente para una clienta nueva', async () => {
    const { linea } = await anotar('s-2', { nuevaClienta: 'ana' }, [5000]);

    expect(linea).toMatchObject({ clientaNombre: 'ana', estadoPago: 'PENDIENTE', bolsaRevisada: false });
    expect(precios(linea)).toEqual([5000]);
    expect((await listarClientas()).map((c) => c.nombre)).toContain('ana');
  });

  it('crea una línea nueva para una clienta existente que aún no compra en este live', async () => {
    const totalClientas = (await listarClientas()).length;

    const { linea } = await anotar('s-2', { clientaId: 'c-6' }, [4000]);

    expect(linea.clientaNombre).toBe('Valentina Soto');
    expect(await listarClientas()).toHaveLength(totalClientas);
  });

  it('la línea anotada queda como la última modificada', async () => {
    const { linea } = await anotar('s-2', { clientaId: 'c-1' }, [3000]);
    const { lineas } = await obtenerSesion('s-2');
    const masReciente = [...lineas].sort((a, b) => b.actualizada.localeCompare(a.actualizada))[0];
    expect(masReciente?.id).toBe(linea.id);
  });

  it('no anota en un live que no está Abierto, y no cambia nada', async () => {
    const antes = await obtenerSesion('s-1');
    await expect(anotar('s-1', { clientaId: 'c-2' }, [6000])).rejects.toThrow('no está abierto');
    expect(await obtenerSesion('s-1')).toEqual(antes);
  });

  it('rechaza precios inválidos', async () => {
    await expect(anotar('s-2', { clientaId: 'c-2' }, [])).rejects.toThrow();
    await expect(anotar('s-2', { clientaId: 'c-2' }, [0])).rejects.toThrow();
    await expect(anotar('s-2', { clientaId: 'c-2' }, [6500])).rejects.toThrow();
  });
});

describe('deshacerAnotacion (D-11)', () => {
  it('quita solo las prendas recién agregadas a una línea existente', async () => {
    const antes = await lineaDe('Florencia Ruiz');
    const { anotacionId } = await anotar('s-2', { clientaId: 'c-2' }, [6000, 4000]);

    await deshacerAnotacion(anotacionId);

    expect(await lineaDe('Florencia Ruiz')).toEqual(antes);
  });

  it('elimina la línea y la clienta que la anotación creó', async () => {
    const sesionAntes = await obtenerSesion('s-2');
    const clientasAntes = await listarClientas();
    const { anotacionId } = await anotar('s-2', { nuevaClienta: 'ana' }, [5000]);

    await deshacerAnotacion(anotacionId);

    expect(await obtenerSesion('s-2')).toEqual(sesionAntes);
    expect(await listarClientas()).toEqual(clientasAntes);
  });
});
