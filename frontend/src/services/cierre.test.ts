import { describe, expect, it } from 'vitest';
import { lineas, usuarios } from './mock/datos';
import {
  abrirSesion,
  alternarPago,
  anotar,
  bolsasEnBodega,
  finalizarCierre,
  marcarNoPago,
  obtenerSesion,
  reabrirSesion,
  registrarBolsas,
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

  it('después de terminar solo se agregan prendas a una clienta que ya está en la hoja (D-48)', async () => {
    await terminarSesion('s-2');
    await expect(anotar('s-2', { clientaId: 'c-2' }, [6000])).resolves.toMatchObject({ linea: { clientaId: 'c-2' } });
    await expect(anotar('s-2', { clientaId: 'c-6' }, [6000])).rejects.toThrow('ya está en la hoja');
    await expect(anotar('s-2', { nuevaClienta: 'Ana' }, [6000])).rejects.toThrow('ya está en la hoja');
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

describe('registrarBolsas (D-47)', () => {
  it('guarda las bolsas y si se entregaron, En cierre y también con el live Cerrado', async () => {
    await terminarSesion('s-2');
    expect(await registrarBolsas('s-2', 'l-4', { bolsas: 2, entregada: false })).toMatchObject({ bolsas: 2, entregada: false });

    expect(await registrarBolsas('s-1', 'l-1', { bolsas: 1, entregada: true })).toMatchObject({ bolsas: 1, entregada: true });
  });

  it('con el live Abierto no se registran, y las bolsas van de 0 a 99', async () => {
    await expect(registrarBolsas('s-2', 'l-4', { bolsas: 1, entregada: false })).rejects.toThrow('cuando termina el live');
    await terminarSesion('s-2');
    await expect(registrarBolsas('s-2', 'l-4', { bolsas: -1, entregada: false })).rejects.toThrow('0 a 99');
    expect((await linea('l-4')).bolsas).toBe(0);
  });

  it('no reordena la hoja', async () => {
    await terminarSesion('s-2');
    const antes = (await linea('l-4')).actualizada;
    await registrarBolsas('s-2', 'l-4', { bolsas: 1, entregada: false });
    expect((await linea('l-4')).actualizada).toBe(antes);
  });
});

describe('bolsasEnBodega (D-47)', () => {
  it('suma por clienta las bolsas que no se han entregado', async () => {
    await terminarSesion('s-2');
    await registrarBolsas('s-2', 'l-4', { bolsas: 2, entregada: false });
    await registrarBolsas('s-1', 'l-1', { bolsas: 1, entregada: false });
    const l4 = await linea('l-4');
    const delCerrado = (await obtenerSesion('s-1')).lineas.find((l) => l.id === 'l-1')!;

    const enBodega = await bolsasEnBodega();

    expect(enBodega).toContainEqual({ clientaId: l4.clientaId, bolsas: l4.clientaId === delCerrado.clientaId ? 3 : 2 });
    expect(enBodega.every((b) => b.bolsas > 0)).toBe(true);
  });
});

/** Deja s-2 En cierre y listo para finalizar, salvo lo que cada test cambie después. */
async function cierreListo() {
  await terminarSesion('s-2');
  for (const l of lineas.filter((l) => l.sesionId === 's-2')) {
    if (l.estadoPago === 'PENDIENTE') await alternarPago('s-2', l.id);
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

  it('no finaliza con líneas Pendientes; marcadas No pagó, sí', async () => {
    await cierreListo();
    await alternarPago('s-2', 'l-4'); // vuelve a Pendiente

    await expect(finalizarCierre('s-2')).rejects.toThrow('Pendiente');
    await marcarNoPago('s-2', 'l-4', true);
    await expect(finalizarCierre('s-2')).resolves.toMatchObject({ estado: 'CERRADA' });
  });

  it('finaliza sin bolsas ni entregas registradas (D-47)', async () => {
    await cierreListo();

    await expect(finalizarCierre('s-2')).resolves.toMatchObject({ estado: 'CERRADA' });
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
