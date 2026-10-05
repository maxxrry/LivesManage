/**
 * Tipos del dominio según docs/ERS.md y docs/decisiones.md.
 *
 * - Montos: pesos chilenos (CLP) como enteros. Nunca decimales.
 * - Fechas: strings ISO 8601, como llegan en el JSON de la API.
 * - Ningún tipo guarda totales: siempre se calculan desde las prendas vigentes.
 */

/** Monto en pesos chilenos, entero (ej: 17000 = $17.000). */
export type MontoClp = number;

/** Fecha y hora ISO 8601 (ej: "2026-09-24T21:00:00-03:00"). */
export type FechaIso = string;

// Enums (D-08). Los textos visibles están en ./etiquetas.ts.

export const ESTADOS_SESION = ['ABIERTA', 'EN_CIERRE', 'CERRADA'] as const;
export type EstadoSesion = (typeof ESTADOS_SESION)[number];

export const ESTADOS_PRENDA = ['VIGENTE', 'CANCELADA'] as const;
export type EstadoPrenda = (typeof ESTADOS_PRENDA)[number];

export const ESTADOS_PAGO = ['PENDIENTE', 'PAGADO', 'NO_PAGO'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const TIPOS_ENTREGA = ['DESPACHO', 'RETIRO', 'FERIA'] as const;
export type TipoEntrega = (typeof TIPOS_ENTREGA)[number];

export const ROLES = ['ADMIN', 'VENDEDOR'] as const;
export type Rol = (typeof ROLES)[number];

/** D-04. */
export interface Direccion {
  /** Texto libre: calle, número, depto. */
  calle: string;
  comuna: string;
  /** Por defecto "Metropolitana". */
  region: string;
  referencia?: string;
}

export const REGION_POR_DEFECTO = 'Metropolitana';

/** Registro de un live. Estados: ABIERTA → EN_CIERRE → CERRADA. */
export interface Sesion {
  id: string;
  nombre?: string;
  inicio: FechaIso;
  estado: EstadoSesion;
}

/** Ítem anotado en una línea. Solo tiene precio; nunca se borra. */
export interface Prenda {
  id: string;
  precio: MontoClp;
  estado: EstadoPrenda;
}

/** Quién y cuándo cambió el estado de pago (RF-07). */
export interface CambioPago {
  fecha: FechaIso;
  usuarioId: string;
}

/**
 * Una clienta, sus prendas y su estado dentro de una sesión.
 * Máximo una línea por clienta por sesión.
 */
export interface Linea {
  id: string;
  sesionId: string;
  clientaId: string;
  /** Copia del nombre guardada por ms-lives (D-03). */
  clientaNombre: string;
  prendas: Prenda[];
  estadoPago: EstadoPago;
  pagoActualizado?: CambioPago;
  /** Check de bolsa revisada en el cierre (RF-09). */
  bolsaRevisada: boolean;
  /** Única referencia entre línea y entrega (D-05). */
  entregaId?: string;
  /** Última modificación; la hoja se ordena por este campo (RF-08). */
  actualizada: FechaIso;
}

/**
 * Forma de entrega. Puede agrupar varias líneas de la misma sesión;
 * las líneas se obtienen filtrando por Linea.entregaId (D-05).
 */
export interface Entrega {
  id: string;
  sesionId: string;
  tipo: TipoEntrega;
  /** Obligatoria cuando el tipo es DESPACHO. */
  direccion?: Direccion;
}

export interface Clienta {
  id: string;
  /** Único dato obligatorio: se crea desde la anotación rápida. */
  nombre: string;
  usuarioTiktok?: string;
  telefono?: string;
  direccion?: Direccion;
  /** Fecha de la última compra (línea Pagada en un live Cerrado). La calcula ms-clientas (D-15). */
  ultimaCompra?: FechaIso;
  /** Baja lógica (RF-12). */
  activa: boolean;
}

/** D-07. */
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
}

/** Un live en la lista de lives (RF-04). Los totales los calcula el backend. */
export interface SesionResumen extends Sesion {
  /** Número de clientas: una línea por clienta. */
  clientas: number;
  total: MontoClp;
  totalPagado: MontoClp;
}

/** Respuesta de la API al pedir un live con su hoja completa. */
export interface SesionDetalle {
  sesion: Sesion;
  lineas: Linea[];
  entregas: Entrega[];
}

/** RF-13: una línea de la clienta con su live y su entrega, para el historial de la ficha. */
export interface CompraClienta {
  sesion: Sesion;
  linea: Linea;
  entrega?: Entrega;
}
