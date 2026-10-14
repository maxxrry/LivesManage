package cl.livesmanage.auth.dto;

import cl.livesmanage.auth.model.Rol;
import cl.livesmanage.auth.model.Usuario;

/** Usuario como lo ve el frontend (tipo Usuario de D-07). Sin contraseña. */
public record UsuarioDto(String id, String nombre, String correo, Rol rol, boolean activo) {

    public static UsuarioDto de(Usuario usuario) {
        return new UsuarioDto(usuario.getId(), usuario.getNombre(), usuario.getCorreo(), usuario.getRol(), usuario.isActivo());
    }
}
