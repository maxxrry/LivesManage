package cl.livesmanage.lives.controller;

import cl.livesmanage.lives.dto.AgruparEntrega;
import cl.livesmanage.lives.dto.CambioNoPago;
import cl.livesmanage.lives.dto.CompraClienta;
import cl.livesmanage.lives.dto.DatosEntrega;
import cl.livesmanage.lives.dto.Destino;
import cl.livesmanage.lives.dto.EntregaDto;
import cl.livesmanage.lives.dto.LineaDto;
import cl.livesmanage.lives.dto.NuevaAnotacion;
import cl.livesmanage.lives.dto.NuevaSesion;
import cl.livesmanage.lives.dto.ResultadoAnotar;
import cl.livesmanage.lives.dto.SesionDetalleDto;
import cl.livesmanage.lives.dto.SesionDto;
import cl.livesmanage.lives.dto.SesionResumenDto;
import cl.livesmanage.lives.service.LiveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** RF-04 a RF-11, más el historial de compras (RF-13, RF-14). Rutas como las anota frontend/src/services/sesionesService.ts (D-37). */
@RestController
@RequestMapping("/api/lives")
@RequiredArgsConstructor
@SecurityRequirement(name = "jwt")
public class LiveController {

    private final LiveService servicio;

    @Operation(summary = "Lives con sus totales, el más reciente primero (RF-04)")
    @GetMapping
    public ResponseEntity<List<SesionResumenDto>> listar() {
        return ResponseEntity.ok(servicio.listar());
    }

    @Operation(summary = "Abrir un live (RF-04)", description = "409 si ya hay uno Abierto.")
    @PostMapping
    public ResponseEntity<SesionDto> abrir(@Valid @RequestBody(required = false) NuevaSesion datos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio.abrir(datos == null ? null : datos.nombre()));
    }

    @Operation(summary = "Un live con su hoja completa (RF-08)")
    @GetMapping("/{id}")
    public ResponseEntity<SesionDetalleDto> obtener(@PathVariable String id) {
        return ResponseEntity.ok(servicio.obtener(id));
    }

    @Operation(summary = "Anotar una compra (RF-05)", description = "Suma a la línea de la clienta o la crea; con { nuevaClienta } también crea la clienta.")
    @PostMapping("/{id}/anotaciones")
    public ResponseEntity<ResultadoAnotar> anotar(@PathVariable String id, @Valid @RequestBody NuevaAnotacion datos, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio.anotar(id, datos, jwt.getSubject()));
    }

    @Operation(summary = "Deshacer una anotación (D-11)", description = "409 si la línea cambió después (D-22) o el live ya no está Abierto.")
    @DeleteMapping("/{id}/anotaciones/{anotacionId}")
    public ResponseEntity<Void> deshacer(@PathVariable String id, @PathVariable String anotacionId) {
        servicio.deshacer(id, anotacionId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Cancelar o restaurar una prenda (RF-06)")
    @PatchMapping("/{id}/lineas/{lineaId}/prendas/{prendaId}")
    public ResponseEntity<LineaDto> alternarPrenda(@PathVariable String id, @PathVariable String lineaId, @PathVariable String prendaId,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(servicio.alternarPrenda(id, lineaId, prendaId, jwt.getSubject()));
    }

    @Operation(summary = "Cambiar la clienta de una línea; si ya tenía línea, se unen (RF-06, D-19)")
    @PatchMapping("/{id}/lineas/{lineaId}/clienta")
    public ResponseEntity<LineaDto> cambiarClienta(@PathVariable String id, @PathVariable String lineaId, @Valid @RequestBody Destino destino,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(servicio.cambiarClienta(id, lineaId, destino, jwt.getSubject()));
    }

    @Operation(summary = "Pasar la línea de Pendiente a Pagado o al revés (RF-07)")
    @PatchMapping("/{id}/lineas/{lineaId}/pago")
    public ResponseEntity<LineaDto> alternarPago(@PathVariable String id, @PathVariable String lineaId, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(servicio.alternarPago(id, lineaId, jwt.getSubject()));
    }

    // Cierre (RF-09 a RF-11)

    @Operation(summary = "Terminar el live: pasa de Abierta a En cierre (RF-09)")
    @PostMapping("/{id}/terminar")
    public ResponseEntity<SesionDto> terminar(@PathVariable String id) {
        return ResponseEntity.ok(servicio.terminar(id));
    }

    @Operation(summary = "Marcar o desmarcar la bolsa revisada (RF-09)", description = "Solo En cierre.")
    @PatchMapping("/{id}/lineas/{lineaId}/bolsa")
    public ResponseEntity<LineaDto> alternarBolsa(@PathVariable String id, @PathVariable String lineaId) {
        return ResponseEntity.ok(servicio.alternarBolsa(id, lineaId));
    }

    @Operation(summary = "Registrar la forma de entrega (RF-10)", description = "Despacho exige dirección, que queda en la ficha de la clienta.")
    @PutMapping("/{id}/lineas/{lineaId}/entrega")
    public ResponseEntity<EntregaDto> registrarEntrega(@PathVariable String id, @PathVariable String lineaId, @Valid @RequestBody DatosEntrega datos) {
        return ResponseEntity.ok(servicio.registrarEntrega(id, lineaId, datos));
    }

    @Operation(summary = "Enviar junto con el despacho de otra clienta del live (RF-10)")
    @PatchMapping("/{id}/lineas/{lineaId}/entrega")
    public ResponseEntity<EntregaDto> agruparEntrega(@PathVariable String id, @PathVariable String lineaId, @Valid @RequestBody AgruparEntrega datos) {
        return ResponseEntity.ok(servicio.agruparEntrega(id, lineaId, datos.entregaId()));
    }

    @Operation(summary = "Marcar No pagó o volver a Pendiente (RF-11)", description = "Solo En cierre y sobre líneas no Pagadas.")
    @PutMapping("/{id}/lineas/{lineaId}/no-pago")
    public ResponseEntity<LineaDto> marcarNoPago(@PathVariable String id, @PathVariable String lineaId, @Valid @RequestBody CambioNoPago datos,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(servicio.marcarNoPago(id, lineaId, datos.noPago(), jwt.getSubject()));
    }

    @Operation(summary = "Finalizar el cierre (RF-11)", description = "409 con lo que falta: bolsas, líneas Pendientes o entregas.")
    @PostMapping("/{id}/finalizar")
    public ResponseEntity<SesionDto> finalizar(@PathVariable String id) {
        return ResponseEntity.ok(servicio.finalizar(id));
    }

    @Operation(summary = "Reabrir un live Cerrado (solo Admin, RF-11)")
    @PostMapping("/{id}/reabrir")
    public ResponseEntity<SesionDto> reabrir(@PathVariable String id) {
        return ResponseEntity.ok(servicio.reabrir(id));
    }

    // Historial (RF-13, RF-14) y renombrar (D-28)

    @Operation(summary = "Líneas con su live y su entrega, el live más reciente primero", description = "Con clientaId, solo las de esa clienta.")
    @GetMapping("/lineas")
    public ResponseEntity<List<CompraClienta>> compras(@RequestParam(required = false) String clientaId) {
        return ResponseEntity.ok(servicio.compras(clientaId));
    }

    @Operation(summary = "Igualar el nombre de la clienta en sus líneas al de su ficha (lo llama ms-clientas al editarla, D-28)")
    @PostMapping("/clientas/{clientaId}/sincronizar-nombre")
    public ResponseEntity<Void> sincronizarNombre(@PathVariable String clientaId) {
        servicio.sincronizarNombre(clientaId);
        return ResponseEntity.noContent().build();
    }
}
