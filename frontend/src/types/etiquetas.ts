import type { EstadoPago, EstadoPrenda, EstadoSesion, Rol, TipoEntrega } from './dominio';

/**
 * Único lugar con los textos visibles de los enums (D-08).
 * Los componentes nunca escriben estos textos directamente.
 */
export const ETIQUETAS_ESTADO_SESION: Record<EstadoSesion, string> = {
  ABIERTA: 'Abierta',
  EN_CIERRE: 'En cierre',
  CERRADA: 'Cerrada',
};

export const ETIQUETAS_ESTADO_PRENDA: Record<EstadoPrenda, string> = {
  VIGENTE: 'Vigente',
  CANCELADA: 'Cancelada',
};

export const ETIQUETAS_ESTADO_PAGO: Record<EstadoPago, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  NO_PAGO: 'No pagó',
};

export const ETIQUETAS_TIPO_ENTREGA: Record<TipoEntrega, string> = {
  DESPACHO: 'Despacho',
  RETIRO: 'Retiro',
  FERIA: 'Feria',
};

export const ETIQUETAS_ROL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
};
