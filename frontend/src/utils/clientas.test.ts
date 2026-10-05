import { describe, expect, it } from 'vitest';
import type { Clienta } from '../types/dominio';
import { buscarClientas, duplicadosDe, normalizarDireccion, normalizarTelefono, normalizarTiktok } from './clientas';

const clienta = (id: string, nombre: string, extra: Partial<Clienta> = {}): Clienta => ({ id, nombre, activa: true, ...extra });

const clientas: Clienta[] = [
  clienta('c-1', 'Gabriela Peña', { usuarioTiktok: '@gabi.pena' }),
  clienta('c-2', 'Florencia Ruiz', { telefono: '+56 9 8765 4321' }),
  clienta('c-3', 'Javiera Soto', { usuarioTiktok: '@javisoto', telefono: '+56 9 1234 5678' }),
];

describe('normalizarTiktok (D-28)', () => {
  it.each([
    ['@gabi.pena', '@gabi.pena'],
    ['gabi.pena', '@gabi.pena'],
    ['  @Gabi.Pena ', '@gabi.pena'],
    ['@@gabi', '@gabi'],
    ['', ''],
    ['  @ ', ''],
  ])('"%s" → "%s"', (texto, esperado) => {
    expect(normalizarTiktok(texto)).toBe(esperado);
  });
});

describe('normalizarTelefono (D-28)', () => {
  it.each([
    ['+56 9 1234 5678', '912345678'],
    ['912345678', '912345678'],
    ['9 1234-5678', '912345678'],
    ['(+56) 912345678', '912345678'],
    ['', ''],
  ])('"%s" → "%s"', (texto, esperado) => {
    expect(normalizarTelefono(texto)).toBe(esperado);
  });
});

describe('duplicadosDe (RF-12)', () => {
  it('encuentra la clienta que ya tiene ese usuario de TikTok, escrito de otra forma', () => {
    expect(duplicadosDe({ usuarioTiktok: 'Gabi.Pena' }, clientas).tiktok?.id).toBe('c-1');
  });

  it('encuentra la clienta que ya tiene ese teléfono, escrito de otra forma', () => {
    expect(duplicadosDe({ telefono: '912345678' }, clientas).telefono?.id).toBe('c-3');
  });

  it('ignora a la misma clienta al editarla', () => {
    expect(duplicadosDe({ usuarioTiktok: '@javisoto', telefono: '+56 9 1234 5678' }, clientas, 'c-3')).toEqual({});
  });

  it('campos vacíos nunca son duplicados', () => {
    expect(duplicadosDe({ usuarioTiktok: '', telefono: '  ' }, clientas)).toEqual({});
  });
});

describe('buscarClientas (RF-12)', () => {
  const nombres = (texto: string) => buscarClientas(texto, clientas).map((c) => c.nombre);

  it('busca por nombre sin tildes ni mayúsculas', () => {
    expect(nombres('pena')).toEqual(['Gabriela Peña']);
    expect(nombres('FLO')).toEqual(['Florencia Ruiz']);
  });

  it('busca por usuario de TikTok, con o sin @', () => {
    expect(nombres('@javi')).toEqual(['Javiera Soto']);
    expect(nombres('gabi.p')).toEqual(['Gabriela Peña']);
  });

  it('busca por teléfono (dígitos)', () => {
    expect(nombres('8765')).toEqual(['Florencia Ruiz']);
    expect(nombres('1234 5678')).toEqual(['Javiera Soto']);
  });

  it('sin texto devuelve todas, ordenadas por nombre', () => {
    expect(nombres('')).toEqual(['Florencia Ruiz', 'Gabriela Peña', 'Javiera Soto']);
  });
});

describe('normalizarDireccion (D-04, D-28)', () => {
  it('exige calle y comuna, y pone Metropolitana si no hay región', () => {
    expect(normalizarDireccion({ calle: ' Los Aromos 1234 ', comuna: ' Maipú ', region: '' })).toEqual({
      calle: 'Los Aromos 1234',
      comuna: 'Maipú',
      region: 'Metropolitana',
    });
    expect(() => normalizarDireccion({ calle: '', comuna: 'Maipú', region: '' })).toThrow('calle');
    expect(() => normalizarDireccion({ calle: 'Los Aromos', comuna: ' ', region: '' })).toThrow('comuna');
  });

  it('conserva la referencia solo si tiene texto', () => {
    expect(normalizarDireccion({ calle: 'A 1', comuna: 'B', region: 'Valparaíso', referencia: ' Portón verde ' })).toEqual({
      calle: 'A 1',
      comuna: 'B',
      region: 'Valparaíso',
      referencia: 'Portón verde',
    });
    expect(normalizarDireccion({ calle: 'A 1', comuna: 'B', region: '', referencia: '  ' })).not.toHaveProperty('referencia');
  });
});
