import { coincideNombre } from '../features/live/sugerirClientas';
import { REGION_POR_DEFECTO, type Clienta, type CompraClienta, type Direccion, type FechaIso, type MontoClp } from '../types/dominio';
import { diaChile, diasEntre } from './fechas';
import { totalLinea, totalesDeLineas } from './montos';

/** "  @Gabi.Pena " → "@gabi.pena". Vacío si no hay usuario (D-28). */
export function normalizarTiktok(texto: string): string {
  const usuario = texto.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return usuario ? `@${usuario}` : '';
}

/** "+56 9 1234 5678" → "912345678": se comparan los últimos 9 dígitos (D-28). */
export function normalizarTelefono(texto: string): string {
  return texto.replace(/\D/g, '').slice(-9);
}

/** Dirección en blanco para un formulario (región por defecto: Metropolitana). */
export const DIRECCION_VACIA: Direccion = { calle: '', comuna: '', region: REGION_POR_DEFECTO, referencia: '' };

/** "Los Aromos 1234, Maipú". */
export const textoDireccion = (d: Direccion) => `${d.calle}, ${d.comuna}`;

/** Dirección válida: calle y comuna obligatorias; región Metropolitana por defecto (D-04). */
export function normalizarDireccion(direccion: Direccion): Direccion {
  const calle = direccion.calle.trim();
  const comuna = direccion.comuna.trim();
  if (!calle) throw new Error('Falta la calle de la dirección.');
  if (!comuna) throw new Error('Falta la comuna de la dirección.');
  const valida: Direccion = { calle, comuna, region: direccion.region.trim() || REGION_POR_DEFECTO };
  const referencia = direccion.referencia?.trim();
  if (referencia) valida.referencia = referencia;
  return valida;
}

export interface Duplicados {
  tiktok?: Clienta;
  telefono?: Clienta;
}

/** RF-12: otra clienta que ya tenga ese usuario de TikTok o ese teléfono. Avisa, no bloquea (D-28). */
export function duplicadosDe(
  datos: { usuarioTiktok?: string; telefono?: string },
  clientas: Clienta[],
  excluirId?: string,
): Duplicados {
  const tiktok = normalizarTiktok(datos.usuarioTiktok ?? '');
  const telefono = normalizarTelefono(datos.telefono ?? '');
  const otras = clientas.filter((c) => c.id !== excluirId);
  const duplicados: Duplicados = {};
  const conTiktok = tiktok && otras.find((c) => normalizarTiktok(c.usuarioTiktok ?? '') === tiktok);
  const conTelefono = telefono && otras.find((c) => normalizarTelefono(c.telefono ?? '') === telefono);
  if (conTiktok) duplicados.tiktok = conTiktok;
  if (conTelefono) duplicados.telefono = conTelefono;
  return duplicados;
}

/** RF-12: busca por nombre (sin tildes), usuario de TikTok o teléfono. Ordena por nombre. */
export function buscarClientas(texto: string, clientas: Clienta[]): Clienta[] {
  const tiktok = normalizarTiktok(texto).slice(1);
  const digitos = texto.replace(/\D/g, '');
  const coincide = (c: Clienta) =>
    coincideNombre(c.nombre, texto) ||
    (tiktok !== '' && normalizarTiktok(c.usuarioTiktok ?? '').includes(tiktok)) ||
    (digitos.length >= 3 && (c.telefono ?? '').replace(/\D/g, '').includes(digitos));
  return clientas.filter(coincide).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export interface IndicadoresClienta {
  totalGastado: MontoClp;
  compras: number;
  ticketPromedio: MontoClp;
  ultimaCompra?: FechaIso;
  prendasCanceladas: number;
  livesSinPago: number;
}

/**
 * RF-13: indicadores de la ficha. Solo cuentan los lives Cerrados (D-29).
 * Una compra es una línea Pagada con monto; las de $0 no cuentan (D-27).
 */
export function indicadoresDeClienta(historial: CompraClienta[]): IndicadoresClienta {
  const cerradas = historial.filter((c) => c.sesion.estado === 'CERRADA');
  const compras = cerradas.filter((c) => c.linea.estadoPago === 'PAGADO' && totalLinea(c.linea.prendas) > 0);
  const totalGastado = totalesDeLineas(compras.map((c) => c.linea)).pagado;
  const indicadores: IndicadoresClienta = {
    totalGastado,
    compras: compras.length,
    ticketPromedio: compras.length ? Math.round(totalGastado / compras.length) : 0,
    prendasCanceladas: cerradas.flatMap((c) => c.linea.prendas).filter((p) => p.estado === 'CANCELADA').length,
    livesSinPago: cerradas.filter((c) => c.linea.estadoPago === 'NO_PAGO').length,
  };
  const ultima = compras.map((c) => c.sesion.inicio).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  if (ultima) indicadores.ultimaCompra = ultima;
  return indicadores;
}

export type CriterioRanking = 'TOTAL' | 'COMPRAS';

export interface PosicionRanking {
  clienta: Clienta;
  totalGastado: MontoClp;
  compras: number;
}

/** Compras de una clienta, con la definición de la ficha (D-29). */
const indicadoresDe = (clienta: Clienta, historial: CompraClienta[]) =>
  indicadoresDeClienta(historial.filter((c) => c.linea.clientaId === clienta.id));

/**
 * RF-14: ranking por total gastado o por número de compras en un rango de días "aaaa-mm-dd" (ambos incluidos,
 * en hora de Chile). Incluye a las desactivadas. Empates: el otro criterio y luego el nombre (D-30).
 */
export function rankingDeClientas(
  clientas: Clienta[],
  historial: CompraClienta[],
  criterio: CriterioRanking,
  rango: { desde: string; hasta: string },
): PosicionRanking[] {
  const enRango = historial.filter((c) => {
    const dia = diaChile(c.sesion.inicio);
    return dia >= rango.desde && dia <= rango.hasta;
  });
  const [primero, segundo] = criterio === 'TOTAL' ? (['totalGastado', 'compras'] as const) : (['compras', 'totalGastado'] as const);
  return clientas
    .map((clienta) => {
      const { totalGastado, compras } = indicadoresDe(clienta, enRango);
      return { clienta, totalGastado, compras };
    })
    .filter((p) => p.compras > 0)
    .sort((a, b) => b[primero] - a[primero] || b[segundo] - a[segundo] || a.clienta.nombre.localeCompare(b.clienta.nombre, 'es'));
}

export interface ClientaInactiva {
  clienta: Clienta;
  ultimaCompra: FechaIso;
  diasSinComprar: number;
}

/**
 * RF-14: clientas con al menos una compra y ninguna en los últimos `dias` días (ERS: 60 por defecto).
 * Sin las desactivadas (D-30). Primero las que llevan más tiempo sin comprar.
 */
export function clientasInactivas(
  clientas: Clienta[],
  historial: CompraClienta[],
  hoy: FechaIso | Date,
  dias: number,
): ClientaInactiva[] {
  const diaHoy = diaChile(hoy);
  return clientas
    .filter((c) => c.activa)
    .flatMap((clienta) => {
      const { ultimaCompra } = indicadoresDe(clienta, historial);
      if (!ultimaCompra) return [];
      const diasSinComprar = diasEntre(diaChile(ultimaCompra), diaHoy);
      return diasSinComprar > dias ? [{ clienta, ultimaCompra, diasSinComprar }] : [];
    })
    .sort((a, b) => b.diasSinComprar - a.diasSinComprar || a.clienta.nombre.localeCompare(b.clienta.nombre, 'es'));
}
