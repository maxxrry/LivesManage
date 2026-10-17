package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.TipoEntrega;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/** Cuerpo de PUT .../lineas/{lineaId}/entrega (RF-10). La dirección solo cuenta para Despacho, donde es obligatoria. */
public record DatosEntrega(@NotNull(message = "Elige la forma de entrega.") TipoEntrega tipo, @Valid DireccionDto direccion) {}
