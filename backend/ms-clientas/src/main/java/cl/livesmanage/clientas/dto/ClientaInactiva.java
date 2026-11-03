package cl.livesmanage.clientas.dto;

import java.time.Instant;

/** RF-14: una clienta inactiva con los datos para contactarla, como ClientaInactiva del frontend. */
public record ClientaInactiva(ClientaDto clienta, Instant ultimaCompra, long diasSinComprar) {}
