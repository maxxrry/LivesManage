import type { Sesion } from '../types/dominio';
import { formatearDiaMes } from './fechas';

/** Nombre visible de un live: el suyo o "Live del 24/09" si no tiene (no se guarda). */
export function nombreSesion(sesion: Sesion): string {
  return sesion.nombre ?? `Live del ${formatearDiaMes(sesion.inicio)}`;
}
