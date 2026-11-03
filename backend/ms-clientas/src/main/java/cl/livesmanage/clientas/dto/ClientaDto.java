package cl.livesmanage.clientas.dto;

import cl.livesmanage.clientas.model.Clienta;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * Clienta como la ve el frontend (tipo Clienta): los campos opcionales vacíos no se envían.
 * `ultimaCompra` (D-15) solo viene en la lista, que es lo que ordena las sugerencias al anotar (D-42).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ClientaDto(String id, String nombre, String usuarioTiktok, String telefono, DireccionDto direccion, boolean activa, Instant ultimaCompra) {

    public static ClientaDto de(Clienta c) {
        return de(c, null);
    }

    public static ClientaDto de(Clienta c, Instant ultimaCompra) {
        return new ClientaDto(c.getId(), c.getNombre(), c.getUsuarioTiktok(), c.getTelefono(), DireccionDto.de(c.getDireccion()), c.isActiva(), ultimaCompra);
    }
}
