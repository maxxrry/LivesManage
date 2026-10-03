import { describe, expect, it } from 'vitest';
import { sesiones } from './mock/datos';
import { abrirSesion, alternarBolsa, alternarPrenda, anotar, obtenerSesion, terminarSesion } from './sesionesService';

// Datos simulados: s-2 Abierto con 5 líneas (l-4 Gabriela), s-1 Cerrado.
const linea = async (id: string) => (await obtenerSesion('s-2')).lineas.find((l) => l.id === id)!;

describe('terminarSesion (RF-09)', () => {
  it('pasa el live de Abierto a En cierre', async () => {
    const sesion = await terminarSesion('s-2');

    expect(sesion.estado).toBe('EN_CIERRE');
    expect((await obtenerSesion('s-2')).sesion.estado).toBe('EN_CIERRE');
  });

  it('después de terminar ya no se puede anotar', async () => {
    await terminarSesion('s-2');
    await expect(anotar('s-2', { clientaId: 'c-2' }, [6000])).rejects.toThrow('no está abierto');
  });

  it('después de terminar se puede abrir un live nuevo', async () => {
    await terminarSesion('s-2');
    await expect(abrirSesion('Live viernes')).resolves.toMatchObject({ estado: 'ABIERTA' });
  });

  it('solo se puede terminar un live Abierto', async () => {
    await expect(terminarSesion('s-1')).rejects.toThrow('Solo se puede terminar un live abierto');
    await terminarSesion('s-2');
    await expect(terminarSesion('s-2')).rejects.toThrow('Solo se puede terminar un live abierto');
  });
});

describe('alternarBolsa (RF-09)', () => {
  it('marca y desmarca la bolsa revisada de una línea En cierre', async () => {
    await terminarSesion('s-2');

    expect((await alternarBolsa('s-2', 'l-4')).bolsaRevisada).toBe(true);
    expect((await alternarBolsa('s-2', 'l-4')).bolsaRevisada).toBe(false);
  });

  it('no se puede revisar bolsas con el live Abierto ni Cerrado (D-25)', async () => {
    await expect(alternarBolsa('s-2', 'l-4')).rejects.toThrow('Las bolsas se revisan en el cierre');
    await expect(alternarBolsa('s-1', 'l-1')).rejects.toThrow();
    expect((await linea('l-4')).bolsaRevisada).toBe(false);
  });

  it('corregir una línea con la bolsa marcada no la desmarca (D-25)', async () => {
    await terminarSesion('s-2');
    await alternarBolsa('s-2', 'l-4');

    const corregida = await alternarPrenda('s-2', 'l-4', (await linea('l-4')).prendas[0]!.id);

    expect(corregida.bolsaRevisada).toBe(true);
  });

  it('no reordena la hoja', async () => {
    sesiones.find((s) => s.id === 's-2')!.estado = 'EN_CIERRE';
    const antes = (await linea('l-4')).actualizada;
    await alternarBolsa('s-2', 'l-4');
    expect((await linea('l-4')).actualizada).toBe(antes);
  });
});
