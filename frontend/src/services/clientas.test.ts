import { afterEach, describe, expect, it, vi } from 'vitest';
import { lineas, usuarios } from './mock/datos';
import {
  actualizarClienta,
  buscarDuplicados,
  cambiarActiva,
  cambiarDiasInactividad,
  crearClienta,
  listarClientas,
  listarInactivas,
  obtenerClienta,
  obtenerDiasInactividad,
  rankingClientas,
} from './clientasService';

// Datos simulados: c-1 Gabriela (@gabi.pena), c-3 Javiera (@javisoto, +56 9 1234 5678).
// Gabriela tiene líneas en el live Cerrado (l-3) y en el Abierto (l-4).

describe('crearClienta (RF-12)', () => {
  it('crea una clienta activa con solo el nombre', async () => {
    const nueva = await crearClienta({ nombre: '  Ana Rojas ' });

    expect(nueva).toMatchObject({ nombre: 'Ana Rojas', activa: true });
    expect((await listarClientas()).map((c) => c.nombre)).toContain('Ana Rojas');
  });

  it('guarda el usuario de TikTok normalizado y la dirección con región por defecto', async () => {
    const nueva = await crearClienta({
      nombre: 'Ana',
      usuarioTiktok: 'Ana.R',
      telefono: ' +56 9 5555 4444 ',
      direccion: { calle: 'Pasaje 1', comuna: 'Puente Alto', region: '' },
    });

    expect(nueva).toMatchObject({
      usuarioTiktok: '@ana.r',
      telefono: '+56 9 5555 4444',
      direccion: { calle: 'Pasaje 1', comuna: 'Puente Alto', region: 'Metropolitana' },
    });
  });

  it('exige nombre, y calle y comuna si hay dirección', async () => {
    await expect(crearClienta({ nombre: '  ' })).rejects.toThrow('nombre');
    await expect(crearClienta({ nombre: 'Ana', direccion: { calle: 'Pasaje 1', comuna: '', region: '' } })).rejects.toThrow(
      'comuna',
    );
  });

  it('un usuario de TikTok ya registrado no bloquea: se guarda igual (D-28)', async () => {
    const nueva = await crearClienta({ nombre: 'Otra Gabi', usuarioTiktok: '@gabi.pena' });
    expect(nueva.usuarioTiktok).toBe('@gabi.pena');
  });
});

describe('buscarDuplicados (RF-12)', () => {
  it('avisa qué clienta ya tiene ese usuario de TikTok o teléfono', async () => {
    const duplicados = await buscarDuplicados({ usuarioTiktok: 'GABI.PENA', telefono: '912345678' });
    expect(duplicados.tiktok?.nombre).toBe('Gabriela Peña');
    expect(duplicados.telefono?.nombre).toBe('Javiera Soto');
  });

  it('al editar, no se avisa a sí misma', async () => {
    expect(await buscarDuplicados({ usuarioTiktok: '@gabi.pena' }, 'c-1')).toEqual({});
  });
});

describe('actualizarClienta (RF-12)', () => {
  it('completa los datos de una clienta creada desde la anotación', async () => {
    const editada = await actualizarClienta('c-4', { nombre: 'Camila Rojas', telefono: '+56 9 1111 2222' });
    expect(editada).toMatchObject({ nombre: 'Camila Rojas', telefono: '+56 9 1111 2222' });
  });

  it('dejar un campo vacío lo borra', async () => {
    const editada = await actualizarClienta('c-1', { nombre: 'Gabriela Peña', usuarioTiktok: '' });
    expect(editada).not.toHaveProperty('usuarioTiktok');
  });

  it('renombrar actualiza el nombre en todas sus líneas, también en lives Cerrados (D-28)', async () => {
    await actualizarClienta('c-1', { nombre: 'Gabriela Peña Soto', usuarioTiktok: '@gabi.pena' });

    const suyas = lineas.filter((l) => l.clientaId === 'c-1');
    expect(suyas.length).toBeGreaterThan(1);
    expect(suyas.every((l) => l.clientaNombre === 'Gabriela Peña Soto')).toBe(true);
  });

  it('no cambia ultimaCompra ni el estado activa', async () => {
    const antes = await obtenerClienta('c-3');
    const editada = await actualizarClienta('c-3', { nombre: 'Javi Soto' });
    expect(editada.ultimaCompra).toBe(antes.ultimaCompra);
    expect(editada.activa).toBe(true);
  });
});

describe('cambiarActiva (RF-12)', () => {
  it('la administradora desactiva y reactiva; la clienta conserva sus líneas', async () => {
    const lineasAntes = lineas.filter((l) => l.clientaId === 'c-1').length;

    expect((await cambiarActiva('c-1', false)).activa).toBe(false);
    expect(lineas.filter((l) => l.clientaId === 'c-1')).toHaveLength(lineasAntes);
    expect((await cambiarActiva('c-1', true)).activa).toBe(true);
  });

  it('solo la administradora puede desactivar', async () => {
    usuarios[0]!.rol = 'VENDEDOR';
    try {
      await expect(cambiarActiva('c-1', false)).rejects.toThrow('administrador');
      expect((await obtenerClienta('c-1')).activa).toBe(true);
    } finally {
      usuarios[0]!.rol = 'ADMIN';
    }
  });
});

describe('ranking e inactivas (RF-14)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Live jueves (24/09, Cerrado): Javiera pagó $12.000 y Valentina $4.000; Gabriela no pagó.
  it('el ranking usa los lives Cerrados del rango', async () => {
    const ranking = await rankingClientas('TOTAL', { desde: '2026-09-01', hasta: '2026-09-30' });
    expect(ranking.map((p) => [p.clienta.nombre, p.totalGastado])).toEqual([
      ['Javiera Soto', 12000],
      ['Valentina Soto', 4000],
    ]);
    expect(await rankingClientas('TOTAL', { desde: '2026-09-25', hasta: '2026-09-30' })).toEqual([]);
  });

  it('las inactivas se cuentan hasta hoy con los días configurados', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00-03:00')); // 61 días después del live jueves

    expect((await listarInactivas()).map((i) => [i.clienta.nombre, i.diasSinComprar])).toEqual([
      ['Javiera Soto', 61],
      ['Valentina Soto', 61],
    ]);
    await cambiarDiasInactividad(61);
    expect(await listarInactivas()).toEqual([]);
  });

  it('solo la administradora cambia los días, entre 1 y 365', async () => {
    expect(await obtenerDiasInactividad()).toBe(60);
    await expect(cambiarDiasInactividad(0)).rejects.toThrow('entre 1 y 365');
    await expect(cambiarDiasInactividad(2.5)).rejects.toThrow('entre 1 y 365');
    usuarios[0]!.rol = 'VENDEDOR';
    try {
      await expect(cambiarDiasInactividad(30)).rejects.toThrow('Solo un administrador');
    } finally {
      usuarios[0]!.rol = 'ADMIN';
    }
    expect(await obtenerDiasInactividad()).toBe(60);
  });
});
