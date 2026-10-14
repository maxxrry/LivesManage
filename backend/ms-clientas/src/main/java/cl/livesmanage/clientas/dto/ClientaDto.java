package cl.livesmanage.clientas.dto;

import cl.livesmanage.clientas.model.Clienta;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Clienta como la ve el frontend (tipo Clienta): los campos opcionales vacíos no se envían.
 * `ultimaCompra` (D-15) se agrega cuando ms-clientas consulte a ms-lives (paso 7 de docs/plan-backend.md).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ClientaDto(String id, String nombre, String usuarioTiktok, String telefono, DireccionDto direccion, boolean activa) {

    public static ClientaDto de(Clienta c) {
        return new ClientaDto(c.getId(), c.getNombre(), c.getUsuarioTiktok(), c.getTelefono(), DireccionDto.de(c.getDireccion()), c.isActiva());
    }
}
