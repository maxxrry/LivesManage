package cl.livesmanage.lives.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo de PATCH .../lineas/{lineaId}/entrega: sumarse al despacho de otra clienta del live (RF-10, D-26). */
public record AgruparEntrega(@NotBlank(message = "Indica el despacho.") String entregaId) {}
