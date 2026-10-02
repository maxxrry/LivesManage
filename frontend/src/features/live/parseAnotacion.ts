import type { MontoClp } from '../../types/dominio';

export type ResultadoAnotacion = { nombre: string; precios: MontoClp[] } | { error: string };

const GRUPO_PRECIOS = String.raw`\d+(?:\s*-\s*\d+)*`;
const SOLO_PRECIOS = new RegExp(`^${GRUPO_PRECIOS}$`);
// Nombre lo más corto posible, de modo que los precios sean el último grupo (D-12).
const NOMBRE_Y_PRECIOS = new RegExp(`^(.+?)\\s+(${GRUPO_PRECIOS})$`);

/**
 * Interpreta la sintaxis del cuaderno: "flo 6-4" → { nombre: "flo", precios: [6000, 4000] }.
 * Los precios van en miles, enteros de 1 a 999.
 */
export function parseAnotacion(texto: string): ResultadoAnotacion {
  const limpio = texto.trim().replace(/\s+/g, ' ');

  if (!limpio) return { error: 'Escribe el nombre y los precios (ej: flo 6-4).' };
  if (/-\s*$/.test(limpio)) return { error: 'Falta un precio después del guion.' };
  if (/\d[.,]\d/.test(limpio)) return { error: 'Los precios van en miles enteros (6 = $6.000).' };
  if (SOLO_PRECIOS.test(limpio)) return { error: 'Falta el nombre de la clienta.' };

  const partes = NOMBRE_Y_PRECIOS.exec(limpio);
  if (!partes) {
    return /\d/.test(limpio)
      ? { error: 'Formato no válido. Escribe el nombre y los precios separados por guion (ej: flo 6-4).' }
      : { error: 'Faltan los precios (ej: flo 6-4).' };
  }

  const [, nombre = '', grupo = ''] = partes;
  const miles = grupo.split('-').map((p) => Number(p.trim()));
  if (miles.some((m) => m < 1 || m > 999)) {
    return { error: 'Cada precio va en miles, entre 1 y 999.' };
  }

  return { nombre, precios: miles.map((m) => m * 1000) };
}

/** Nombre escrito hasta ahora, aunque la anotación esté incompleta ("flo 6-" → "flo"). */
export function nombreEscrito(texto: string): string {
  const resultado = parseAnotacion(texto);
  if ('nombre' in resultado) return resultado.nombre;
  return texto.trim().replace(/\s+/g, ' ').replace(/\s+[\d\s-]*$/, '');
}
