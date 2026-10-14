package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.Entrega;
import cl.livesmanage.lives.model.TipoEntrega;
import com.fasterxml.jackson.annotation.JsonInclude;

/** Tipo Entrega del frontend. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EntregaDto(String id, String sesionId, TipoEntrega tipo, DireccionDto direccion) {

    public static EntregaDto de(Entrega e) {
        return new EntregaDto(e.getId(), e.getSesionId(), e.getTipo(), DireccionDto.de(e.getDireccion()));
    }
}
