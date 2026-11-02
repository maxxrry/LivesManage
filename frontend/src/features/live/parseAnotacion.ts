import type { MontoClp } from '../../types/dominio';

export type ResultadoAnotacion = { nombre: string; precios: MontoClp[] } | { error: string };
export type ResultadoPrecios = { precios: MontoClp[] } | { error: string };

// Un precio tiene 4 o más dígitos, o puntos de miles: "6.000". Un número menor es parte del nombre (D-12, D-39).
const PRECIO = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d{4,})`;
const SEPARADOR = String.raw`\s*-\s*|\s+`;
const SEPARADOR_PRECIOS = new RegExp(SEPARADOR);
const GRUPO_PRECIOS = `${PRECIO}(?:(?:${SEPARADOR})${PRECIO})*`;
const SOLO_PRECIOS = new RegExp(`^${GRUPO_PRECIOS}$`);
// Nombre lo más corto posible, de modo que los precios sean el último grupo (D-12).
const NOMBRE_Y_PRECIOS = new RegExp(`^(.+?)\\s+(${GRUPO_PRECIOS})$`);
// Termina en números que no son precios completos: "flo 6-4", "flo 3,5".
const PRECIOS_INCOMPLETOS = /(?:^|\s)[\d.,]+(?:\s*-\s*[\d.,]+)*$/;
const ERROR_INCOMPLETOS = 'Escribe los precios completos (ej: flo 6000 4000).';

/** "6,000", "3,5", "6-4", "6000" o "-" no son parte de un nombre, a diferencia de un número corto como el de "Cami 2". */
const esRestoDePrecio = (palabra: string) => /^[\d.,-]+$/.test(palabra) && !/^\d{1,3}$/.test(palabra);

const limpiar = (texto: string) => texto.trim().replace(/\s+/g, ' ');
const ERROR_GUION = 'Falta un precio después del guion.';

function validarPrecios(grupo: string): ResultadoPrecios {
  const precios = grupo.split(SEPARADOR_PRECIOS).map((p) => Number(p.replaceAll('.', '')));
  if (precios.some((p) => p < 1000 || p > 999_000)) return { error: 'Cada precio va de $1.000 a $999.000.' };
  if (precios.some((p) => p % 100 !== 0)) return { error: 'Los precios van en múltiplos de $100 (ej: 3500).' };
  return { precios };
}

/**
 * Interpreta la anotación: "flo 6000 4000" → { nombre: "flo", precios: [6000, 4000] }.
 * Los precios van completos, separados por espacio o guion, de $1.000 a $999.000 en múltiplos de $100 (D-39).
 */
export function parseAnotacion(texto: string): ResultadoAnotacion {
  const limpio = limpiar(texto);

  if (!limpio) return { error: 'Escribe el nombre y los precios (ej: flo 6000 4000).' };
  if (/-\s*$/.test(limpio)) return { error: ERROR_GUION };
  if (SOLO_PRECIOS.test(limpio)) return { error: 'Falta el nombre de la clienta.' };

  const partes = NOMBRE_Y_PRECIOS.exec(limpio);
  if (!partes) {
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

/** Solo los precios, para agregar prendas a una línea desde el lápiz (D-41): "6000 4000" → [6000, 4000]. */
export function parsePrecios(texto: string): ResultadoPrecios {
  const limpio = limpiar(texto);

  if (!limpio) return { error: 'Escribe los precios (ej: 6000 4000).' };
  if (/-\s*$/.test(limpio)) return { error: ERROR_GUION };
  if (SOLO_PRECIOS.test(limpio)) return validarPrecios(limpio);
  return /^[\d.,\s-]+$/.test(limpio)
    ? { error: 'Escribe los precios completos (ej: 6000 4000).' }
    : { error: 'Escribe solo los precios (ej: 6000 4000).' };
}

/** Nombre escrito hasta ahora, aunque la anotación esté incompleta ("flo 6000-" → "flo"). */
export function nombreEscrito(texto: string): string {
  const resultado = parseAnotacion(texto);
  if ('nombre' in resultado) return resultado.nombre;
  return limpiar(texto).replace(/\s+[\d.,\s-]*$/, '');
}
