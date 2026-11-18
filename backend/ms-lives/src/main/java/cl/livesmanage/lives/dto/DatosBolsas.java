package cl.livesmanage.lives.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Cuerpo de PUT .../lineas/{lineaId}/bolsas: cuántas bolsas se armaron y si ya se entregaron (D-47). */
public record DatosBolsas(
        @Min(value = 0, message = "Las bolsas no pueden ser negativas.") @Max(value = 99, message = "Son demasiadas bolsas.") int bolsas,
        boolean entregada) {}
