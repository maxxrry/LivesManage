package cl.livesmanage.clientas.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/** RF-13: indicadores de la ficha, como IndicadoresClienta del frontend. Sin compras, no trae `ultimaCompra`. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record IndicadoresClienta(long totalGastado, long compras, long ticketPromedio, Instant ultimaCompra, long prendasCanceladas, long livesSinPago) {}
