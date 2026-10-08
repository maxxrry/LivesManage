import type { MontoClp, Sesion, SesionResumen } from '../types/dominio';
import { diaChile, formatearDiaMes } from './fechas';

/** Nombre visible de un live: el suyo o "Live del 24/09" si no tiene (no se guarda). */
export function nombreSesion(sesion: Sesion): string {
  return sesion.nombre ?? `Live del ${formatearDiaMes(sesion.inicio)}`;
}

/** Ruta de un live: En cierre se abre directo en su cierre (D-25). */
export function rutaDeSesion(sesion: Sesion): string {
  return sesion.estado === 'EN_CIERRE' ? `/lives/${sesion.id}/cierre` : `/lives/${sesion.id}`;
}

export interface ResumenLive {
  sesion: SesionResumen;
  cobrado: MontoClp;
  noPago: MontoClp;
}

export interface ResumenLives {
  /** El más reciente primero. */
  lives: ResumenLive[];
  vendido: MontoClp;
  cobrado: MontoClp;
  noPago: MontoClp;
}

/**
 * Estadísticas de lives (D-32): solo lives Cerrados con inicio en el período (días en hora de Chile, extremos incluidos).
 * En un live Cerrado no quedan Pendientes, así que lo que no se cobró es No pagó.
 */
export function resumenDeLives(sesiones: SesionResumen[], rango: { desde: string; hasta: string }): ResumenLives {
  const lives = sesiones
    .filter((s) => {
      const dia = diaChile(s.inicio);
      return s.estado === 'CERRADA' && dia >= rango.desde && dia <= rango.hasta;
    })
    .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))
    .map((sesion) => ({ sesion, cobrado: sesion.totalPagado, noPago: sesion.total - sesion.totalPagado }));
  const suma = (campo: (l: ResumenLive) => MontoClp) => lives.reduce((t, l) => t + campo(l), 0);
  return { lives, vendido: suma((l) => l.sesion.total), cobrado: suma((l) => l.cobrado), noPago: suma((l) => l.noPago) };
}
