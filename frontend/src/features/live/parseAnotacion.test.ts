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
    // D-46: en el lápiz no hay nombre que confundir, así que los miles valen con o sin guion.
    ['6-4', [6000, 4000]],
    ['6 4', [6000, 4000]],
    ['6', [6000]],
    ['6 - 2500', [6000, 2500]],
  ])('"%s" → %j', (texto, precios) => {
    expect(parsePrecios(texto)).toEqual({ precios });
  });

  it.each([
    ['', 'Escribe los precios'],
    ['   ', 'Escribe los precios'],
    ['6000-', 'Falta un precio después del guion'],
    ['3,5', 'Escribe los precios'],
    ['6000--4000', 'Escribe los precios'],
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
      // D-46: un número de 1 a 3 dígitos unido con guion es un precio en miles.
      ['flo 6-4', 'flo', [6000, 4000]],
      ['flo 6-6-5', 'flo', [6000, 6000, 5000]],
      ['flo 6 - 4', 'flo', [6000, 4000]],
      ['flo 6-2500', 'flo', [6000, 2500]],
      ['flo 6-4000', 'flo', [6000, 4000]],
      ['flo 6 - 4000', 'flo', [6000, 4000]],
      ['flo 6-4 6000', 'flo', [6000, 4000, 6000]],
      ['flo 6000 6-4', 'flo', [6000, 6000, 4000]],
      ['Cami 2 6-6', 'Cami 2', [6000, 6000]],
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
      // D-46: sin guion, los miles no se aceptan, para no crear una clienta "flo 6" (D-39).
      ['flo 6 4', '¿Quisiste decir "flo 6-4"?'],
      ['flo 6 6 5', '¿Quisiste decir "flo 6-6-5"?'],
      ['flo 6', 'Escribe los precios completos o en miles con guion'],
      ['flo 6000 4', 'Escribe los precios completos o en miles con guion'],
      ['flo 3,5', 'Escribe los precios completos o en miles con guion'],
      ['flo 3.5', 'Escribe los precios completos o en miles con guion'],
      ['flo 6,000', 'Escribe los precios completos o en miles con guion'],
      // Un resto de precio antes de los precios no puede terminar en el nombre de una clienta nueva.
      ['flo 6,000 4000', 'Escribe los precios completos o en miles con guion'],
      ['flo 6000, 4000', 'Escribe los precios completos o en miles con guion'],
      ['flo 3,5 6000', 'Escribe los precios completos o en miles con guion'],
      ['flo 6000 ana 5000', 'Escribe los precios completos o en miles con guion'],
      ['flo 6-4 ana 5000', 'Escribe los precios completos o en miles con guion'],
      ['Cami 2', 'Escribe los precios completos o en miles con guion'],
      ['6-4', 'Falta el nombre'],
      ['flo 0-4', 'de $1.000 a $999.000'],
      ['flo 0000', 'de $1.000 a $999.000'],
      ['flo 1000000', 'de $1.000 a $999.000'],
      ['flo 6.000.000', 'de $1.000 a $999.000'],
      ['flo 6550', 'múltiplos de $100'],
      ['flo 6000--4000', 'Escribe los precios completos o en miles con guion'],
      ['flo6000', 'Formato no válido'],
    ])('"%s" → error que menciona "%s"', (texto, mensaje) => {
      const resultado = parseAnotacion(texto);
      expect(resultado).toHaveProperty('error');
      expect('error' in resultado && resultado.error).toContain(mensaje);
    });
  });

  describe('clienta cuyo nombre termina en número (D-46)', () => {
    const existe = (nombre: string) => nombre.toLowerCase() === 'flo 6';

    it('"flo 6 4" anota $4.000 a "flo 6" si esa clienta existe', () => {
      expect(parseAnotacion('flo 6 4', existe)).toEqual({ nombre: 'flo 6', precios: [4000] });
    });

    it('"flo 6 4" sigue siendo error si la clienta no existe', () => {
      expect(parseAnotacion('flo 6 4', () => false)).toHaveProperty('error');
    });

    it('"flo 6 4-4" no necesita la excepción: "flo 6" queda como nombre', () => {
      expect(parseAnotacion('flo 6 4-4')).toEqual({ nombre: 'flo 6', precios: [4000, 4000] });
    });
  });
});
