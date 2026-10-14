package cl.livesmanage.clientas.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST y PUT /api/clientas (RF-12). Solo el nombre es obligatorio; un campo vacío se borra. */
public record DatosClienta(
        @NotBlank(message = "Falta el nombre de la clienta.")
        @Size(max = 100, message = "El nombre puede tener hasta 100 caracteres.")
        String nombre,

        @Size(max = 60, message = "El usuario de TikTok puede tener hasta 60 caracteres.")
        String usuarioTiktok,

        @Size(max = 30, message = "El teléfono puede tener hasta 30 caracteres.")
        String telefono,

        @Valid
        DireccionDto direccion) {}
