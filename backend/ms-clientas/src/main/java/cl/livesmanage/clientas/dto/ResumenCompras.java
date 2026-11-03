package cl.livesmanage.clientas.dto;

import java.time.Instant;

/** Compras de una clienta en un período, como las entrega ms-lives (D-42). */
public record ResumenCompras(String clientaId, long totalGastado, long compras, Instant ultimaCompra) {}
