package cl.livesmanage.lives.dto;

/** Quién y cuándo cambió el estado de pago (RF-07, tipo CambioPago). */
public record CambioPagoDto(String fecha, String usuarioId) {}
