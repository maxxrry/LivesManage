import { describe, expect, it } from 'vitest';
import { nombreEscrito, parseAnotacion } from './parseAnotacion';

describe('nombreEscrito (sugerencias mientras se escribe)', () => {
  it.each([
    ['flo', 'flo'],
    ['flo 6', 'flo'],
    ['flo 6-', 'flo'],
    ['flo 6 - 4', 'flo'],
    ['Gabriela Peña 6-6', 'Gabriela Peña'],
    ['Cami 2 6-4', 'Cami 2'],
    ['', ''],
  ])('"%s" → "%s"', (texto, nombre) => {
    expect(nombreEscrito(texto)).toBe(nombre);
  });
});

describe('parseAnotacion (RF-05)', () => {
  describe('anotaciones válidas', () => {
    it.each([
      ['flo 6-4', 'flo', [6000, 4000]],
      ['flo 6 - 4', 'flo', [6000, 4000]],
      ['flo 6 -4', 'flo', [6000, 4000]],
      ['Gabriela Peña 6-6-5', 'Gabriela Peña', [6000, 6000, 5000]],
      ['ana 5', 'ana', [5000]],
      ['flo 1-999', 'flo', [1000, 999000]],
      ['  flo   6-4  ', 'flo', [6000, 4000]],
      ['Gabriela   Peña 6', 'Gabriela Peña', [6000]],
      // D-12: el nombre puede contener números; los precios son el último grupo.
      ['Cami 2 6-4', 'Cami 2', [6000, 4000]],
      ['2 6', '2', [6000]],
      ['flo 6 4', 'flo 6', [4000]],
    ])('"%s" → nombre "%s"', (texto, nombre, precios) => {
      expect(parseAnotacion(texto)).toEqual({ nombre, precios });
    });
  });

  describe('anotaciones inválidas', () => {
    it.each([
      ['', 'Escribe el nombre y los precios'],
      ['   ', 'Escribe el nombre y los precios'],
      ['flo 6-', 'Falta un precio después del guion'],
      ['flo 6 - ', 'Falta un precio después del guion'],
      ['flo', 'Faltan los precios'],
      ['6-4', 'Falta el nombre'],
      ['6 - 4', 'Falta el nombre'],
      ['flo 0', 'entre 1 y 999'],
      ['flo 6-1000', 'entre 1 y 999'],
      ['flo 3,5', 'miles enteros'],
      ['flo 3.5', 'miles enteros'],
      ['flo 6--4', 'Formato no válido'],
      ['flo6-4', 'Formato no válido'],
    ])('"%s" → error que menciona "%s"', (texto, mensaje) => {
      const resultado = parseAnotacion(texto);
      expect(resultado).toHaveProperty('error');
      expect('error' in resultado && resultado.error).toContain(mensaje);
    });
  });
});
