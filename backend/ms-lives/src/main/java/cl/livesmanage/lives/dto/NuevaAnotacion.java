package cl.livesmanage.lives.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Cuerpo de POST /api/lives/{id}/anotaciones (RF-05). Precios en CLP: de $1.000 a $999.000, en miles. */
public record NuevaAnotacion(
        @NotNull(message = "Indica a quién se anota.") @Valid Destino destino,
        @NotEmpty(message = "Faltan los precios.")
        @Size(max = 50, message = "Son demasiadas prendas en una anotación.")
        List<@NotNull @Min(value = 1000, message = "Precios no válidos.") @Max(value = 999000, message = "Precios no válidos.") Integer> precios) {}
