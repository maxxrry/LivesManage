package cl.livesmanage.clientas.dto;

/** RF-14: una fila del ranking, como PosicionRanking del frontend. */
public record PosicionRanking(ClientaDto clienta, long totalGastado, long compras) {}
