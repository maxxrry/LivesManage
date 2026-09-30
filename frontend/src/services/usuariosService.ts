import type { Usuario } from '../types/dominio';
import { usuarios } from './mock/datos';

// Simulado en memoria: siempre la administradora (D-07). Llega con RF-01.

export async function usuarioActual(): Promise<Usuario> {
  const [admin] = usuarios;
  if (!admin) {
    throw new Error('Sin usuario simulado');
  }
  return structuredClone(admin);
}
