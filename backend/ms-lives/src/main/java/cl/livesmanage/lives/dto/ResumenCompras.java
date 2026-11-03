package cl.livesmanage.lives.dto;

import java.time.Instant;

/** Compras de una clienta en un período (D-29, D-42): líneas Pagadas de más de $0 en lives Cerrados. */
public record ResumenCompras(String clientaId, long totalGastado, long compras, Instant ultimaCompra) {}
