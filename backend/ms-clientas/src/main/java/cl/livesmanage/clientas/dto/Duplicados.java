package cl.livesmanage.clientas.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Otra clienta que ya tiene ese usuario de TikTok o ese teléfono. Avisa, no bloquea (D-28). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Duplicados(ClientaDto tiktok, ClientaDto telefono) {}
