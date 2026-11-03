package cl.livesmanage.clientas.controller;

import cl.livesmanage.clientas.dto.ClientaInactiva;
import cl.livesmanage.clientas.dto.CriterioRanking;
import cl.livesmanage.clientas.dto.PosicionRanking;
import cl.livesmanage.clientas.service.EstadisticasService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** RF-14. Rutas como las anota frontend/src/services/clientasService.ts (D-42). */
@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "jwt")
public class EstadisticasController {

    private final EstadisticasService servicio;

    @Operation(summary = "Ranking por total gastado o por compras", description = "Período en días de calendario de Chile (aaaa-mm-dd), con ambos extremos incluidos.")
    @GetMapping("/api/clientas/ranking")
    public ResponseEntity<List<PosicionRanking>> ranking(
            @RequestParam CriterioRanking criterio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(servicio.ranking(criterio, desde, hasta));
    }

    @Operation(summary = "Clientas activas sin comprar hace más de los días configurados")
    @GetMapping("/api/clientas/inactivas")
    public ResponseEntity<List<ClientaInactiva>> inactivas() {
        return ResponseEntity.ok(servicio.inactivas());
    }
}
