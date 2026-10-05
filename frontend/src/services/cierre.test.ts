import { describe, expect, it } from 'vitest';
import { lineas, sesiones, usuarios } from './mock/datos';
import {
  abrirSesion,
  alternarBolsa,
  alternarPago,
  alternarPrenda,
  anotar,
  finalizarCierre,
  marcarNoPago,
  obtenerSesion,
  reabrirSesion,
  registrarEntrega,
  terminarSesion,
} from './sesionesService';

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

/** Deja s-2 En cierre y listo para finalizar, salvo lo que cada test cambie después. */
async function cierreListo() {
  await terminarSesion('s-2');
  for (const l of lineas.filter((l) => l.sesionId === 's-2')) {
    l.bolsaRevisada = true;
    if (l.estadoPago === 'PENDIENTE') await alternarPago('s-2', l.id);
    if (!l.entregaId) await registrarEntrega('s-2', l.id, { tipo: 'RETIRO' });
  }
}

describe('marcarNoPago (RF-11)', () => {
  it('marca una línea Pendiente como No pagó y la devuelve a Pendiente', async () => {
    await terminarSesion('s-2');

    const marcada = await marcarNoPago('s-2', 'l-4', true);
    expect(marcada.estadoPago).toBe('NO_PAGO');
    expect(marcada.pagoActualizado?.usuarioId).toBe('u-1');
    expect((await marcarNoPago('s-2', 'l-4', false)).estadoPago).toBe('PENDIENTE');
  });

  it('repetir la marca (doble toque) no la deshace', async () => {
    await terminarSesion('s-2');

    await marcarNoPago('s-2', 'l-4', true);

    expect((await marcarNoPago('s-2', 'l-4', true)).estadoPago).toBe('NO_PAGO');
  });

  it('solo En cierre y nunca sobre una línea Pagada', async () => {
    await expect(marcarNoPago('s-2', 'l-4', true)).rejects.toThrow('cierre');
    await terminarSesion('s-2');
    await expect(marcarNoPago('s-2', 'l-6', true)).rejects.toThrow('Pagada');
  });
});

describe('finalizarCierre (RF-11)', () => {
  it('pasa el live a Cerrada y queda de solo lectura', async () => {
    await cierreListo();

    expect((await finalizarCierre('s-2')).estado).toBe('CERRADA');
    await expect(alternarPago('s-2', 'l-4')).rejects.toThrow('solo lectura');
  });

  it('no finaliza con bolsas sin revisar', async () => {
    await cierreListo();
    await alternarBolsa('s-2', 'l-4');

    await expect(finalizarCierre('s-2')).rejects.toThrow('bolsa');
    expect((await obtenerSesion('s-2')).sesion.estado).toBe('EN_CIERRE');
  });

  it('no finaliza con líneas Pendientes; marcadas No pagó, sí', async () => {
    await cierreListo();
    await alternarPago('s-2', 'l-4'); // vuelve a Pendiente

    await expect(finalizarCierre('s-2')).rejects.toThrow('Pendiente');
    await marcarNoPago('s-2', 'l-4', true);
    await expect(finalizarCierre('s-2')).resolves.toMatchObject({ estado: 'CERRADA' });
  });

  it('no finaliza con una línea Pagada sin entrega', async () => {
    await cierreListo();
    lineas.find((l) => l.id === 'l-4')!.entregaId = undefined;

    await expect(finalizarCierre('s-2')).rejects.toThrow('entrega');
  });

  it('solo se finaliza un live En cierre', async () => {
    await expect(finalizarCierre('s-2')).rejects.toThrow('En cierre');
    await expect(finalizarCierre('s-1')).rejects.toThrow('En cierre');
  });
});

describe('reabrirSesion (RF-11)', () => {
  it('la administradora reabre un live Cerrado: vuelve a En cierre', async () => {
    expect((await reabrirSesion('s-1')).estado).toBe('EN_CIERRE');
    expect((await obtenerSesion('s-1')).lineas.find((l) => l.id === 'l-3')?.estadoPago).toBe('NO_PAGO');
  });

  it('solo la administradora puede reabrir', async () => {
    usuarios[0]!.rol = 'VENDEDOR';
    try {
      await expect(reabrirSesion('s-1')).rejects.toThrow('administrador');
    } finally {
      usuarios[0]!.rol = 'ADMIN';
    }
  });

  it('solo se reabre un live Cerrado', async () => {
    await expect(reabrirSesion('s-2')).rejects.toThrow('Cerrado');
  });
});
