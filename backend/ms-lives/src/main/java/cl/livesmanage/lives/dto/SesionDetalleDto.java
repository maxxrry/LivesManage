package cl.livesmanage.lives.dto;

import java.util.List;

/** Un live con su hoja completa (tipo SesionDetalle). */
public record SesionDetalleDto(SesionDto sesion, List<LineaDto> lineas, List<EntregaDto> entregas) {}
