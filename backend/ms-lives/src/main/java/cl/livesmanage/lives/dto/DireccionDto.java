package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.Direccion;
import com.fasterxml.jackson.annotation.JsonInclude;

/** Dirección de una entrega (D-04). La validación de entrada llega con RF-10 (paso 6). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DireccionDto(String calle, String comuna, String region, String referencia) {

    public static DireccionDto de(Direccion d) {
        return d == null ? null : new DireccionDto(d.getCalle(), d.getComuna(), d.getRegion(), d.getReferencia());
    }
}
