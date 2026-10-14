package cl.livesmanage.gateway.config;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/** Escribe el cuerpo { mensaje } de D-33 en los rechazos del propio gateway. */
final class RespuestaJson {

    private RespuestaJson() {}

    /** Solo para mensajes fijos del código: no escapa comillas. */
    static void escribir(HttpServletResponse respuesta, int estado, String mensaje) throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json;charset=UTF-8");
        respuesta.getWriter().write("{\"mensaje\":\"" + mensaje + "\"}");
    }
}
