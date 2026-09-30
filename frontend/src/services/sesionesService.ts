import type { Sesion, SesionDetalle } from '../types/dominio';
import { entregas, lineas, sesiones } from './mock/datos';

// Simulado en memoria. Con backend: GET /api/lives y GET /api/lives/{id}.

export async function listarSesiones(): Promise<Sesion[]> {
  return structuredClone(sesiones);
}

export async function obtenerSesion(id: string): Promise<SesionDetalle> {
  const sesion = sesiones.find((s) => s.id === id);
  if (!sesion) {
    throw new Error('Live no encontrado');
  }
  return structuredClone({
    sesion,
    lineas: lineas.filter((l) => l.sesionId === id),
    entregas: entregas.filter((e) => e.sesionId === id),
  });
}
