import { describe, expect, it } from 'vitest';
import type { Clienta } from '../../types/dominio';
import { sugerirClientas } from './sugerirClientas';

const clienta = (id: string, nombre: string, extra: Partial<Clienta> = {}): Clienta => ({
  id,
  nombre,
  activa: true,
  ...extra,
});

const clientas: Clienta[] = [
  clienta('c-1', 'Florencia Ruiz'),
  clienta('c-2', 'Flor Contreras', { ultimaCompra: '2026-09-01T20:00:00-03:00' }),
  clienta('c-3', 'Ana Flores', { ultimaCompra: '2026-09-20T20:00:00-03:00' }),
  clienta('c-4', 'Gabriela Peña'),
  clienta('c-5', 'Florinda Paz', { activa: false }),
  clienta('c-6', 'Cami 2'),
];

const nombres = (resultado: Clienta[]) => resultado.map((c) => c.nombre);

describe('sugerirClientas (RF-05)', () => {
  it('coincide con el inicio del nombre o de cualquier palabra', () => {
    expect(nombres(sugerirClientas('flo', clientas, new Set()))).toEqual(
      expect.arrayContaining(['Florencia Ruiz', 'Flor Contreras', 'Ana Flores']),
    );
    expect(nombres(sugerirClientas('ruiz', clientas, new Set()))).toEqual(['Florencia Ruiz']);
    expect(nombres(sugerirClientas('gabriela pe', clientas, new Set()))).toEqual(['Gabriela Peña']);
  });

  it('no distingue mayúsculas ni tildes', () => {
    expect(nombres(sugerirClientas('PENA', clientas, new Set()))).toEqual(['Gabriela Peña']);
    expect(nombres(sugerirClientas('Peñ', clientas, new Set()))).toEqual(['Gabriela Peña']);
  });

  it('acepta nombres con números (D-12)', () => {
    expect(nombres(sugerirClientas('cami 2', clientas, new Set()))).toEqual(['Cami 2']);
  });

  it('no sugiere clientas desactivadas', () => {
    expect(nombres(sugerirClientas('florinda', clientas, new Set()))).toEqual([]);
  });

  it('ordena: primero las que tienen línea en el live, luego por compra más reciente', () => {
    // Florencia tiene línea en este live; Ana compró el 20/09 y Flor el 01/09.
    expect(nombres(sugerirClientas('flo', clientas, new Set(['c-1'])))).toEqual([
      'Florencia Ruiz',
      'Ana Flores',
      'Flor Contreras',
    ]);
  });

  it('sin texto o sin coincidencias no sugiere nada', () => {
    expect(sugerirClientas('', clientas, new Set())).toEqual([]);
    expect(sugerirClientas('zzz', clientas, new Set())).toEqual([]);
  });

  it('muestra como máximo 5 sugerencias', () => {
    const muchas = Array.from({ length: 8 }, (_, i) => clienta(`m-${i}`, `María ${i}`));
    expect(sugerirClientas('maria', muchas, new Set())).toHaveLength(5);
  });
});
