package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.EstadoSesion;
import cl.livesmanage.lives.model.Sesion;
import cl.livesmanage.lives.service.Totales;
import com.fasterxml.jackson.annotation.JsonInclude;

/** Un live en la lista de lives (RF-04, tipo SesionResumen): la sesión con sus totales calculados. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SesionResumenDto(String id, String nombre, String inicio, EstadoSesion estado, int clientas, int total, int totalPagado) {

    public static SesionResumenDto de(Sesion s, Totales t) {
        return new SesionResumenDto(s.getId(), s.getNombre(), s.getInicio().toString(), s.getEstado(), t.clientas(), t.total(), t.pagado());
    }
}
