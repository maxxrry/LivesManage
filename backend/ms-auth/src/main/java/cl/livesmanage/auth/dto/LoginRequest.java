package cl.livesmanage.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;

/** Cuerpo de POST /api/auth/login (D-31). */
public record LoginRequest(
        @NotBlank(message = "Ingresa tu correo.")
        @Email(message = "Ingresa un correo válido.")
        @Size(max = 254, message = "El correo es demasiado largo.")
        String correo,

        // Sin largo máximo: una contraseña de más de 72 bytes recibe el mismo 401 genérico (D-33).
        @NotBlank(message = "Ingresa tu contraseña.")
        String contrasena) {

    /** Minúsculas y sin espacios antes de validar: un espacio que agrega el teclado del celular no es un error. */
    public LoginRequest {
        correo = correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
    }
}
