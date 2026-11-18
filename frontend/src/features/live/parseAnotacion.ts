import type { MontoClp } from '../../types/dominio';

export type ResultadoAnotacion = { nombre: string; precios: MontoClp[] } | { error: string };
export type ResultadoPrecios = { precios: MontoClp[] } | { error: string };

// Precio completo: 4 o más dígitos, o con puntos de miles ("6.000", D-39).
const COMPLETO = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d{4,})`;
// En miles: 1 a 3 dígitos ("6" = $6.000, D-46). En la anotación solo cuenta si va unido con guion a otro precio.
const MILES = String.raw`\d{1,3}`;
const PRECIO = `(?:${COMPLETO}|${MILES})`;
const GUION = String.raw`\s*-\s*`;
// Un bloque es un precio completo solo, o varios precios unidos con guion ("6-6-5", "6-2500").
const BLOQUE = `(?:${PRECIO}(?:${GUION}${PRECIO})+|${COMPLETO})`;
const GRUPO_PRECIOS = String.raw`${BLOQUE}(?:\s+${BLOQUE})*`;
const SOLO_PRECIOS = new RegExp(`^${GRUPO_PRECIOS}$`);
// Nombre lo más corto posible, de modo que los precios sean el último grupo (D-12).
const NOMBRE_Y_PRECIOS = new RegExp(`^(.+?)\\s+(${GRUPO_PRECIOS})$`);
// "flo 6 4": dos o más números cortos al final, sin guion (D-46).
const MILES_SIN_GUION = /^(.+?)((?:\s+\d{1,3}){2,})$/;
// En el lápiz no hay nombre que confundir: los miles valen con o sin guion (D-46).
const SOLO_PRECIOS_LAPIZ = new RegExp(String.raw`^${PRECIO}(?:(?:${GUION}|\s+)${PRECIO})*$`);
// Termina en algo con forma de número que no es un precio válido: "flo 6", "flo 3,5", "flo 6000--4000".
const PRECIOS_INCOMPLETOS = /(?:^|\s)[\d.,-]*\d[\d.,-]*$/;
const ERROR_INCOMPLETOS = 'Escribe los precios completos o en miles con guion (ej: flo 6000 4000 o flo 6-4).';

/** "6,000", "3,5", "6-4", "6000" o "-" no son parte de un nombre, a diferencia de un número corto como el de "Cami 2". */
const esRestoDePrecio = (palabra: string) => /^[\d.,-]+$/.test(palabra) && !/^\d{1,3}$/.test(palabra);

const limpiar = (texto: string) => texto.trim().replace(/\s+/g, ' ');
const ERROR_GUION = 'Falta un precio después del guion.';

/** "6" → 6000 (en miles); "6.000" o "6000" → 6000. */
const aMonto = (precio: string) => (/^\d{1,3}$/.test(precio) ? Number(precio) * 1000 : Number(precio.replaceAll('.', '')));

function validarPrecios(grupo: string): ResultadoPrecios {
  const precios = grupo.split(/\s*-\s*|\s+/).map(aMonto);
  if (precios.some((p) => p < 1000 || p > 999_000)) return { error: 'Cada precio va de $1.000 a $999.000.' };
  if (precios.some((p) => p % 100 !== 0)) return { error: 'Los precios van en múltiplos de $100 (ej: 3500).' };
  return { precios };
}

/**
 * Interpreta la anotación: "flo 6000 4000" → { nombre: "flo", precios: [6000, 4000] }.
 * Precios completos (D-39) o en miles unidos con guion: "flo 6-6-5" → [6000, 6000, 5000] (D-46).
 * Sin guion, "flo 6 4" es error, para no crear una clienta "flo 6", salvo que `existeClienta("flo 6")`.
 */
export function parseAnotacion(texto: string, existeClienta: (nombre: string) => boolean = () => false): ResultadoAnotacion {
  const limpio = limpiar(texto);

  if (!limpio) return { error: 'Escribe el nombre y los precios (ej: flo 6000 4000).' };
  if (/-\s*$/.test(limpio)) return { error: ERROR_GUION };
  if (SOLO_PRECIOS.test(limpio)) return { error: 'Falta el nombre de la clienta.' };

  const partes = NOMBRE_Y_PRECIOS.exec(limpio);
  if (!partes) {
    const sinGuion = MILES_SIN_GUION.exec(limpio);
    if (sinGuion && !sinGuion[1]!.split(' ').some(esRestoDePrecio)) {
      const numeros = sinGuion[2]!.trim().split(' ');
      const ultimo = numeros.pop()!;
      const nombreConNumero = `${sinGuion[1]} ${numeros.join(' ')}`;
      if (existeClienta(nombreConNumero)) {
        const validados = validarPrecios(ultimo);
        return 'error' in validados ? validados : { nombre: nombreConNumero, ...validados };
      }
      return { error: `Los miles van con guion. ¿Quisiste decir "${sinGuion[1]} ${[...numeros, ultimo].join('-')}"?` };
    }
    if (PRECIOS_INCOMPLETOS.test(limpio)) return { error: ERROR_INCOMPLETOS };
    return /\d/.test(limpio)
      ? { error: 'Formato no válido. Escribe el nombre y los precios (ej: flo 6000 4000).' }
      : { error: 'Faltan los precios (ej: flo 6000 4000).' };
  }

  const [, nombre = '', grupo = ''] = partes;
  if (nombre.split(' ').some(esRestoDePrecio)) return { error: ERROR_INCOMPLETOS };

  const validados = validarPrecios(grupo);
  return 'error' in validados ? validados : { nombre, ...validados };
}

/** Solo los precios, para agregar prendas a una línea desde el lápiz (D-41): "6000 4000" o "6 4" → [6000, 4000] (D-46). */
export function parsePrecios(texto: string): ResultadoPrecios {
  const limpio = limpiar(texto);

  if (!limpio) return { error: 'Escribe los precios (ej: 6000 4000).' };
  if (/-\s*$/.test(limpio)) return { error: ERROR_GUION };
  if (SOLO_PRECIOS_LAPIZ.test(limpio)) return validarPrecios(limpio);
  return /^[\d.,\s-]+$/.test(limpio)
    ? { error: 'Escribe los precios completos o en miles (ej: 6000 4000 o 6 4).' }
    : { error: 'Escribe solo los precios (ej: 6000 4000).' };
}

/** Nombre escrito hasta ahora, aunque la anotación esté incompleta ("flo 6000-" → "flo"). */
export function nombreEscrito(texto: string, existeClienta?: (nombre: string) => boolean): string {
  const resultado = parseAnotacion(texto, existeClienta);
  if ('nombre' in resultado) return resultado.nombre;
  return limpiar(texto).replace(/\s+[\d.,\s-]*$/, '');
}
