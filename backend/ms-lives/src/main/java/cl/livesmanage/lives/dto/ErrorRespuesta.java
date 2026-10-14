package cl.livesmanage.lives.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/** Cuerpo de toda respuesta de error: un mensaje para mostrar y, si aplica, el error de cada campo. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorRespuesta(String mensaje, Map<String, String> campos) {

    public ErrorRespuesta(String mensaje) {
        this(mensaje, null);
    }
}
