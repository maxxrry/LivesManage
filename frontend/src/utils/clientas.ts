import { coincideNombre } from '../features/live/sugerirClientas';
import { REGION_POR_DEFECTO, type Clienta, type Direccion } from '../types/dominio';

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
