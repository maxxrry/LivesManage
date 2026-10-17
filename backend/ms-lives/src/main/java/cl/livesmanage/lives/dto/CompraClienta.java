package cl.livesmanage.lives.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Una línea de una clienta con su live y su entrega (RF-13, tipo CompraClienta). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CompraClienta(SesionDto sesion, LineaDto linea, EntregaDto entrega) {}
