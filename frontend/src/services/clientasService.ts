import type { Clienta } from '../types/dominio';
import { clientas } from './mock/datos';

// Simulado en memoria. Con backend: GET /api/clientas y GET /api/clientas/{id}.

export async function listarClientas(): Promise<Clienta[]> {
  return structuredClone(clientas);
}

export async function obtenerClienta(id: string): Promise<Clienta> {
  const clienta = clientas.find((c) => c.id === id);
  if (!clienta) {
    throw new Error('Clienta no encontrada');
  }
  return structuredClone(clienta);
}
