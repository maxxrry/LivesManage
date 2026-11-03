package cl.livesmanage.clientas.dto;

import java.time.Instant;
import java.util.List;

/** Una línea del historial de GET /api/lives/lineas, solo con lo que usan los indicadores (RF-13). */
public record CompraClienta(SesionCompra sesion, LineaCompra linea) {

    public record SesionCompra(Instant inicio, String estado) {}

    public record LineaCompra(String estadoPago, List<PrendaCompra> prendas) {}

    public record PrendaCompra(int precio, String estado) {}
}
