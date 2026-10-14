package cl.livesmanage.auth.dto;

import cl.livesmanage.auth.model.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Locale;

/** Cuerpo de POST /api/usuarios (RF-03). La contraseña es la inicial; nunca se devuelve. */
public record NuevoUsuario(
        @NotBlank(message = "Ingresa el nombre.")
        @Size(max = 100, message = "El nombre puede tener hasta 100 caracteres.")
        String nombre,

        @NotBlank(message = "Ingresa el correo.")
        @Email(message = "Ingresa un correo válido.")
        @Size(max = 254, message = "El correo es demasiado largo.")
        String correo,

        @NotNull(message = "Elige un rol.")
        Rol rol,

        // El máximo de 72 bytes (límite de BCrypt) lo revisa UsuarioService.
        @NotBlank(message = "Ingresa la contraseña inicial.")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.")
        String contrasena) {

    public NuevoUsuario {
        nombre = nombre == null ? null : nombre.trim();
        correo = correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
    }
}
