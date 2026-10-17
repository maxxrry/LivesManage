package cl.livesmanage.lives.dto;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PUT .../lineas/{lineaId}/no-pago (RF-11): fija el estado, así un doble toque no lo deshace. */
public record CambioNoPago(@NotNull Boolean noPago) {}
