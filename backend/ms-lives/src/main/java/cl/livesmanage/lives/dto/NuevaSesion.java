package cl.livesmanage.lives.dto;

import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/lives (RF-04). El nombre es opcional. */
public record NuevaSesion(@Size(max = 100, message = "El nombre puede tener hasta 100 caracteres.") String nombre) {}
