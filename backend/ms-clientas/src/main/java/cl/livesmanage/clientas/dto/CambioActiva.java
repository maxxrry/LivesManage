package cl.livesmanage.clientas.dto;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /api/clientas/{id}/activa: desactivar o reactivar (RF-12, solo Admin). */
public record CambioActiva(@NotNull(message = "Indica si la clienta queda activa.") Boolean activa) {}
