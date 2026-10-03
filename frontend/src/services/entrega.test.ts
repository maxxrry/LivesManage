import { describe, expect, it } from 'vitest';
import { obtenerClienta } from './clientasService';
import { agruparEntrega, cambiarClienta, obtenerSesion, registrarEntrega, terminarSesion } from './sesionesService';

// Datos simulados: s-2 Abierto con l-4 Gabriela (c-1, sin dirección), l-5 Florencia (c-2),
// l-6 Javiera (c-3, con dirección en Maipú y entrega e-2 Retiro). s-1 Cerrado.
const MAIPU = { calle: 'Los Aromos 1234, depto 52', comuna: 'Maipú', region: 'Metropolitana' };
const NUNOA = { calle: 'Irarrázaval 3000', comuna: 'Ñuñoa', region: 'Metropolitana' };

const detalle = () => obtenerSesion('s-2');
const entregaDe = async (lineaId: string) => {
  const { lineas, entregas } = await detalle();
  const linea = lineas.find((l) => l.id === lineaId)!;
  return entregas.find((e) => e.id === linea.entregaId);
};

describe('registrarEntrega (RF-10)', () => {
  it('registra Retiro y Feria sin dirección', async () => {
    await terminarSesion('s-2');

    await registrarEntrega('s-2', 'l-4', { tipo: 'RETIRO' });
    await registrarEntrega('s-2', 'l-5', { tipo: 'FERIA' });

    expect(await entregaDe('l-4')).toMatchObject({ sesionId: 's-2', tipo: 'RETIRO' });
    expect(await entregaDe('l-5')).toMatchObject({ tipo: 'FERIA' });
    expect((await entregaDe('l-5'))?.direccion).toBeUndefined();
  });

  it('Despacho exige calle y comuna', async () => {
    await terminarSesion('s-2');

    await expect(registrarEntrega('s-2', 'l-4', { tipo: 'DESPACHO' })).rejects.toThrow('dirección');
    await expect(
      registrarEntrega('s-2', 'l-4', { tipo: 'DESPACHO', direccion: { ...NUNOA, comuna: '  ' } }),
    ).rejects.toThrow('comuna');
    await expect(
      registrarEntrega('s-2', 'l-4', { tipo: 'DESPACHO', direccion: { ...NUNOA, calle: '' } }),
    ).rejects.toThrow('calle');
    expect(await entregaDe('l-4')).toBeUndefined();
  });

  it('una dirección nueva queda guardada en la ficha de la clienta', async () => {
    await terminarSesion('s-2');

    await registrarEntrega('s-2', 'l-4', { tipo: 'DESPACHO', direccion: { ...NUNOA, calle: ' Irarrázaval 3000 ' } });

    expect((await entregaDe('l-4'))?.direccion).toEqual(NUNOA);
    expect((await obtenerClienta('c-1'))?.direccion).toEqual(NUNOA);
  });

  it('la región es Metropolitana si no se indica (D-04)', async () => {
    await terminarSesion('s-2');

    await registrarEntrega('s-2', 'l-4', { tipo: 'DESPACHO', direccion: { ...NUNOA, region: '' } });

    expect((await entregaDe('l-4'))?.direccion?.region).toBe('Metropolitana');
  });

  it('cambiar la forma de entrega reemplaza la anterior sin crear otra', async () => {
    await terminarSesion('s-2');
    const antes = (await detalle()).entregas.length;

    await registrarEntrega('s-2', 'l-6', { tipo: 'DESPACHO', direccion: MAIPU });

    expect(await entregaDe('l-6')).toMatchObject({ id: 'e-2', tipo: 'DESPACHO', direccion: MAIPU });
    expect((await detalle()).entregas).toHaveLength(antes);
  });

  it('pasar de Despacho a Retiro quita la dirección', async () => {
    await terminarSesion('s-2');
    await registrarEntrega('s-2', 'l-6', { tipo: 'DESPACHO', direccion: MAIPU });

    await registrarEntrega('s-2', 'l-6', { tipo: 'RETIRO' });

    expect((await entregaDe('l-6'))?.direccion).toBeUndefined();
  });

  it('solo se registra con el live En cierre', async () => {
    await expect(registrarEntrega('s-2', 'l-4', { tipo: 'RETIRO' })).rejects.toThrow('cierre');
    await expect(registrarEntrega('s-1', 'l-3', { tipo: 'RETIRO' })).rejects.toThrow();
  });
});

describe('agruparEntrega (RF-10)', () => {
  it('dos clientas agrupadas comparten la entrega y la dirección; cada una conserva su línea y su total', async () => {
    await terminarSesion('s-2');
    await registrarEntrega('s-2', 'l-6', { tipo: 'DESPACHO', direccion: MAIPU });
    const { lineas: antes } = await detalle();

    await agruparEntrega('s-2', 'l-4', 'e-2');

    const { lineas } = await detalle();
    expect(lineas.find((l) => l.id === 'l-4')?.entregaId).toBe('e-2');
    expect((await entregaDe('l-4'))?.direccion).toEqual(MAIPU);
    expect(lineas.find((l) => l.id === 'l-4')?.prendas).toEqual(antes.find((l) => l.id === 'l-4')?.prendas);
    expect(lineas.find((l) => l.id === 'l-6')?.prendas).toEqual(antes.find((l) => l.id === 'l-6')?.prendas);
  });

  it('agrupar no cambia la ficha de la clienta que se suma', async () => {
    await terminarSesion('s-2');
    await registrarEntrega('s-2', 'l-6', { tipo: 'DESPACHO', direccion: MAIPU });

    await agruparEntrega('s-2', 'l-4', 'e-2');

    expect((await obtenerClienta('c-1'))?.direccion).toBeUndefined();
  });

  it('la entrega que queda sin líneas se elimina', async () => {
    await terminarSesion('s-2');
    await registrarEntrega('s-2', 'l-4', { tipo: 'RETIRO' });
    const propia = (await entregaDe('l-4'))!.id;
    await registrarEntrega('s-2', 'l-6', { tipo: 'DESPACHO', direccion: MAIPU });

    await agruparEntrega('s-2', 'l-4', 'e-2');

    expect((await detalle()).entregas.map((e) => e.id)).not.toContain(propia);
  });

  it('cambiar la forma de una clienta agrupada la saca del grupo sin cambiar a las demás (D-26)', async () => {
    await terminarSesion('s-2');
    await registrarEntrega('s-2', 'l-6', { tipo: 'DESPACHO', direccion: MAIPU });
    await agruparEntrega('s-2', 'l-4', 'e-2');

    await registrarEntrega('s-2', 'l-4', { tipo: 'RETIRO' });

    expect(await entregaDe('l-4')).toMatchObject({ tipo: 'RETIRO' });
    expect((await entregaDe('l-4'))?.id).not.toBe('e-2');
    expect(await entregaDe('l-6')).toMatchObject({ id: 'e-2', tipo: 'DESPACHO', direccion: MAIPU });
  });

  it('solo se agrupa a un despacho del mismo live', async () => {
    await terminarSesion('s-2');

    await expect(agruparEntrega('s-2', 'l-4', 'e-2')).rejects.toThrow('despacho');
    await expect(agruparEntrega('s-2', 'l-4', 'e-1')).rejects.toThrow('Entrega no encontrada');
  });
});

describe('unir líneas con entregas (RF-06 + RF-10)', () => {
  it('al unir dos líneas, la entrega que queda sin líneas se elimina (D-05)', async () => {
    await terminarSesion('s-2');
    await registrarEntrega('s-2', 'l-4', { tipo: 'DESPACHO', direccion: NUNOA });
    const deGabriela = (await entregaDe('l-4'))!.id;

    // La línea de Gabriela pasa a Javiera (que tiene e-2): se unen y queda la entrega de Javiera.
    await cambiarClienta('s-2', 'l-4', { clientaId: 'c-3' });

    expect((await detalle()).entregas.map((e) => e.id)).not.toContain(deGabriela);
  });
});
