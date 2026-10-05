import type { FechaIso } from '../types/dominio';

// es-CL formatea con guiones (24-09-2026); se arma a mano para usar dd/mm/aaaa.
const formato = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partes(iso: FechaIso): Record<string, string> {
  return Object.fromEntries(formato.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}

/** "2026-09-24T21:00:00-03:00" → "24/09/2026 21:00", en hora de Chile. */
export function formatearFechaHora(iso: FechaIso): string {
  const { day, month, year, hour, minute } = partes(iso);
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/** "2026-09-24T21:00:00-03:00" → "24/09", en hora de Chile. */
export function formatearDiaMes(iso: FechaIso): string {
  const { day, month } = partes(iso);
  return `${day}/${month}`;
}

/** "2026-09-24T21:00:00-03:00" → "24/09/2026", en hora de Chile. */
export function formatearFecha(iso: FechaIso): string {
  const { day, month, year } = partes(iso);
  return `${day}/${month}/${year}`;
}

const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Día de calendario en Chile, "aaaa-mm-dd" (el formato de <input type="date">). */
export function diaChile(fecha: FechaIso | Date): string {
  return formatoDia.format(new Date(fecha));
}

const utc = (dia: string) => Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)));

/** Días de calendario entre dos días "aaaa-mm-dd" (ej: 24/09 → 24/11 = 61). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((utc(hasta) - utc(desde)) / 86_400_000);
}

/** "2026-10-04" menos 3 meses → "2026-07-04". Si el día no existe en ese mes, el último del mes. */
export function restarMeses(dia: string, meses: number): string {
  const [anio = 0, mes = 1, d = 1] = dia.split('-').map(Number);
  const ultimoDelMes = new Date(Date.UTC(anio, mes - meses, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes - 1 - meses, Math.min(d, ultimoDelMes))).toISOString().slice(0, 10);
}
