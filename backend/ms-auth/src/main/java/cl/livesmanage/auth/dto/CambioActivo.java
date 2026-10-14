package cl.livesmanage.auth.dto;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /api/usuarios/{id}/activo: desactivar o reactivar (RF-03). */
public record CambioActivo(@NotNull(message = "Indica si el usuario queda activo.") Boolean activo) {}
