import { describe, expect, it } from 'vitest';
import { nombreEscrito, parseAnotacion, parsePrecios } from './parseAnotacion';

describe('nombreEscrito (sugerencias mientras se escribe)', () => {
  it.each([
    ['flo', 'flo'],
    ['flo 6', 'flo'],
    ['flo 6000-', 'flo'],
    ['flo 6000 - 4000', 'flo'],
    ['flo 6.000 3.', 'flo'],
    ['Gabriela Peña 6000-6000', 'Gabriela Peña'],
    ['Cami 2 6000 4000', 'Cami 2'],
    ['', ''],
  ])('"%s" → "%s"', (texto, nombre) => {
    expect(nombreEscrito(texto)).toBe(nombre);
  });
});

describe('parsePrecios (agregar prendas desde el lápiz, D-41)', () => {
  it.each([
    ['6000', [6000]],
    ['6000 4000', [6000, 4000]],
    ['6000-4000', [6000, 4000]],
    ['6000 - 4000', [6000, 4000]],
    ['6.000 3.500', [6000, 3500]],
    ['  3500  ', [3500]],
  ])('"%s" → %j', (texto, precios) => {
    expect(parsePrecios(texto)).toEqual({ precios });
  });

  it.each([
    ['', 'Escribe los precios'],
    ['   ', 'Escribe los precios'],
    ['6000-', 'Falta un precio después del guion'],
    ['6 4', 'precios completos'],
    ['6', 'precios completos'],
    ['6-4', 'precios completos'],
    ['3,5', 'precios completos'],
    ['6000 4', 'precios completos'],
    ['6000--4000', 'precios completos'],
    ['flo 6000', 'solo los precios'],
    ['flo', 'solo los precios'],
    ['1000000', 'de $1.000 a $999.000'],
    ['6550', 'múltiplos de $100'],
  ])('"%s" → error que menciona "%s"', (texto, mensaje) => {
    const resultado = parsePrecios(texto);
    expect(resultado).toHaveProperty('error');
    expect('error' in resultado && resultado.error).toContain(mensaje);
  });
});

describe('parseAnotacion (RF-05)', () => {
  describe('anotaciones válidas', () => {
    it.each([
      ['flo 6000 4000', 'flo', [6000, 4000]],
      ['flo 6000-4000', 'flo', [6000, 4000]],
      ['flo 6000 - 4000', 'flo', [6000, 4000]],
      ['flo 6000 -4000', 'flo', [6000, 4000]],
      ['flo 6.000 3.500', 'flo', [6000, 3500]],
      ['flo 6.000-4000', 'flo', [6000, 4000]],
      ['Gabriela Peña 6000 6000 5000', 'Gabriela Peña', [6000, 6000, 5000]],
      ['ana 5000', 'ana', [5000]],
      ['flo 3500', 'flo', [3500]],
      ['flo 1000 999000', 'flo', [1000, 999000]],
      ['flo 999.000', 'flo', [999000]],
      ['  flo   6000   4000  ', 'flo', [6000, 4000]],
      ['Gabriela   Peña 6000', 'Gabriela Peña', [6000]],
      // D-12: un número bajo 1000 es parte del nombre; los precios son el último grupo.
      ['Cami 2 6000 4000', 'Cami 2', [6000, 4000]],
      ['Cami 2 6000-4000', 'Cami 2', [6000, 4000]],
      ['2 6000', '2', [6000]],
      ['María-José 6000', 'María-José', [6000]],
      // Límites aceptados en D-39: sin saber qué se quiso decir, estas lecturas son las que da la regla.
      ['flo 6 4000', 'flo 6', [4000]],
      ['Cami 2000 6000', 'Cami', [2000, 6000]],
    ])('"%s" → nombre "%s"', (texto, nombre, precios) => {
      expect(parseAnotacion(texto)).toEqual({ nombre, precios });
    });
  });

  describe('anotaciones inválidas', () => {
    it.each([
      ['', 'Escribe el nombre y los precios'],
      ['   ', 'Escribe el nombre y los precios'],
      ['flo 6000-', 'Falta un precio después del guion'],
      ['flo 6000 - ', 'Falta un precio después del guion'],
      ['flo', 'Faltan los precios'],
      ['6000 4000', 'Falta el nombre'],
      ['6000-4000', 'Falta el nombre'],
      ['6.000 - 4.000', 'Falta el nombre'],
      // D-39: la sintaxis en miles ya no existe; da error y no crea una clienta "flo 6".
      ['flo 6-4', 'precios completos'],
      ['flo 6 4', 'precios completos'],
      ['flo 6', 'precios completos'],
      ['flo 6000 4', 'precios completos'],
      ['flo 6-4000', 'precios completos'],
      ['flo 3,5', 'precios completos'],
      ['flo 3.5', 'precios completos'],
      ['flo 6,000', 'precios completos'],
      // Un resto de precio antes de los precios no puede terminar en el nombre de una clienta nueva.
      ['flo 6,000 4000', 'precios completos'],
      ['flo 6000, 4000', 'precios completos'],
      ['flo 3,5 6000', 'precios completos'],
      ['flo 6-4 6000', 'precios completos'],
      ['flo 6 - 4000', 'precios completos'],
      ['flo 6000 ana 5000', 'precios completos'],
      ['Cami 2', 'precios completos'],
      ['6-4', 'precios completos'],
      ['flo 0000', 'de $1.000 a $999.000'],
      ['flo 1000000', 'de $1.000 a $999.000'],
      ['flo 6.000.000', 'de $1.000 a $999.000'],
      ['flo 6550', 'múltiplos de $100'],
      ['flo 6000--4000', 'Formato no válido'],
      ['flo6000', 'Formato no válido'],
    ])('"%s" → error que menciona "%s"', (texto, mensaje) => {
      const resultado = parseAnotacion(texto);
      expect(resultado).toHaveProperty('error');
      expect('error' in resultado && resultado.error).toContain(mensaje);
    });
  });
});
