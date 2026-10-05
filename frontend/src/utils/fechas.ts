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
