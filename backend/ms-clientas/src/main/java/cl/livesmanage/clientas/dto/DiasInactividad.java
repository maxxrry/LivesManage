package cl.livesmanage.clientas.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Cuerpo y respuesta de /api/configuracion/dias-inactividad (RF-14). */
public record DiasInactividad(
        @NotNull(message = "Los días deben ser un número entero entre 1 y 365.")
        @Min(value = 1, message = "Los días deben ser un número entero entre 1 y 365.")
        @Max(value = 365, message = "Los días deben ser un número entero entre 1 y 365.")
        Integer dias) {}
