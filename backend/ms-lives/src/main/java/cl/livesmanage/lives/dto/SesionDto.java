package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.EstadoSesion;
import cl.livesmanage.lives.model.Sesion;
import com.fasterxml.jackson.annotation.JsonInclude;

/** Tipo Sesion del frontend. `inicio` en ISO 8601. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SesionDto(String id, String nombre, String inicio, EstadoSesion estado) {

    public static SesionDto de(Sesion s) {
        return new SesionDto(s.getId(), s.getNombre(), s.getInicio().toString(), s.getEstado());
    }
}
