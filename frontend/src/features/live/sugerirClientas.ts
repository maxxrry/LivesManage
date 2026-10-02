import type { Clienta } from '../../types/dominio';

const MAX_SUGERENCIAS = 5;

/** Minúsculas, sin tildes y con espacios simples: "  Peña " → "pena". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function coincide(nombre: string, buscado: string): boolean {
  return nombre.startsWith(buscado) || nombre.split(' ').some((palabra) => palabra.startsWith(buscado));
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
