import type { Clienta } from '../../types/dominio';

const MAX_SUGERENCIAS = 5;

/** Minúsculas, sin tildes y con espacios simples: "  Peña " → "pena". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function coincide(nombre: string, buscado: string): boolean {
  return nombre.startsWith(buscado) || nombre.split(' ').some((palabra) => palabra.startsWith(buscado));
}

/** El nombre (o alguna de sus palabras) empieza con lo escrito, sin distinguir mayúsculas ni tildes. */
export function coincideNombre(nombre: string, texto: string): boolean {
  const buscado = normalizar(texto);
  return buscado === '' || coincide(normalizar(nombre), buscado);
}

const fecha = (iso?: string) => (iso ? Date.parse(iso) : 0);

/**
 * Clientas activas cuyo nombre (o alguna de sus palabras) empieza con lo escrito.
 * Orden (RF-05): primero las que ya tienen línea en el live, luego por compra más reciente.
 */
export function sugerirClientas(texto: string, clientas: Clienta[], idsConLinea: ReadonlySet<string>): Clienta[] {
  const buscado = normalizar(texto);
  if (!buscado) return [];

  return clientas
    .filter((c) => c.activa && coincide(normalizar(c.nombre), buscado))
    .sort(
      (a, b) =>
        Number(idsConLinea.has(b.id)) - Number(idsConLinea.has(a.id)) ||
        fecha(b.ultimaCompra) - fecha(a.ultimaCompra) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    )
    .slice(0, MAX_SUGERENCIAS);
}

/** Opción de la lista de sugerencias: una clienta o crear una nueva con el nombre escrito. */
export type Opcion = { tipo: 'clienta'; clienta: Clienta } | { tipo: 'nueva'; nombre: string };

/** Sugerencias para un nombre escrito, más la opción "Nueva clienta" al final. */
export function opcionesPara(nombre: string, clientas: Clienta[], idsConLinea: ReadonlySet<string>): Opcion[] {
  if (!nombre) return [];
  return [
    ...sugerirClientas(nombre, clientas, idsConLinea).map((clienta) => ({ tipo: 'clienta' as const, clienta })),
    { tipo: 'nueva', nombre },
  ];
}

/** Mueve la opción resaltada con las flechas. Devuelve true si manejó la tecla. */
export function moverResaltada(tecla: string, total: number, cambiar: (f: (i: number) => number) => void): boolean {
  if (total === 0 || (tecla !== 'ArrowDown' && tecla !== 'ArrowUp')) return false;
  const paso = tecla === 'ArrowDown' ? 1 : -1;
  cambiar((i) => (i + paso + total) % total);
  return true;
}
