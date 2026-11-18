package cl.livesmanage.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo de PUT /api/auth/contrasena: cada usuario cambia la suya (D-49). El máximo de 72 bytes lo revisa UsuarioService. */
public record CambioContrasena(
        @NotBlank(message = "Ingresa tu contraseña actual.")
        String actual,

        @NotBlank(message = "Ingresa la contraseña nueva.")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.")
        String nueva) {}
