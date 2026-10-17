package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.Direccion;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Dirección como en el frontend (D-04). Calle y comuna obligatorias; región "Metropolitana" si viene vacía. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DireccionDto(
        @NotBlank(message = "Falta la calle de la dirección.")
        @Size(max = 200, message = "La calle puede tener hasta 200 caracteres.")
        String calle,

        @NotBlank(message = "Falta la comuna de la dirección.")
        @Size(max = 100, message = "La comuna puede tener hasta 100 caracteres.")
        String comuna,

        @Size(max = 100, message = "La región puede tener hasta 100 caracteres.")
        String region,

        @Size(max = 200, message = "La referencia puede tener hasta 200 caracteres.")
        String referencia) {

    public static DireccionDto de(Direccion d) {
        return d == null ? null : new DireccionDto(d.getCalle(), d.getComuna(), d.getRegion(), d.getReferencia());
    }
}
