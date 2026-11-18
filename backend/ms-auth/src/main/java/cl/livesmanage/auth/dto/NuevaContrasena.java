package cl.livesmanage.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo de PUT /api/usuarios/{id}/contrasena: la Admin restablece la de otro usuario (D-49). */
public record NuevaContrasena(
        @NotBlank(message = "Ingresa la contraseña nueva.")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.")
        String contrasena) {}
