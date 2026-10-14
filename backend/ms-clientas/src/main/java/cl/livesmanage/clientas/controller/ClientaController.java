package cl.livesmanage.clientas.controller;

import cl.livesmanage.clientas.dto.CambioActiva;
import cl.livesmanage.clientas.dto.ClientaDto;
import cl.livesmanage.clientas.dto.DatosClienta;
import cl.livesmanage.clientas.dto.DiasInactividad;
import cl.livesmanage.clientas.dto.Duplicados;
import cl.livesmanage.clientas.service.ClientaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** RF-12 y la configuración de RF-14. Rutas como las anota frontend/src/services/clientasService.ts (D-36). */
@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "jwt")
public class ClientaController {

    private final ClientaService servicio;

    @Operation(summary = "Listar clientas (también las desactivadas), por nombre")
    @GetMapping("/api/clientas")
    public ResponseEntity<List<ClientaDto>> listar() {
        return ResponseEntity.ok(servicio.listar());
    }

    @Operation(summary = "Otra clienta con el mismo usuario de TikTok o teléfono (avisa, no bloquea)")
    @GetMapping("/api/clientas/duplicados")
    public ResponseEntity<Duplicados> duplicados(
            @RequestParam(required = false) String usuarioTiktok,
            @RequestParam(required = false) String telefono,
            @RequestParam(required = false) String excluirId) {
        return ResponseEntity.ok(servicio.duplicados(usuarioTiktok, telefono, excluirId));
    }

    @Operation(summary = "Ficha de una clienta")
    @GetMapping("/api/clientas/{id}")
    public ResponseEntity<ClientaDto> obtener(@PathVariable String id) {
        return ResponseEntity.ok(servicio.obtener(id));
    }

    @Operation(summary = "Registrar una clienta")
    @PostMapping("/api/clientas")
    public ResponseEntity<ClientaDto> crear(@Valid @RequestBody DatosClienta datos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio.crear(datos));
    }

    @Operation(summary = "Editar una clienta; un campo vacío se borra")
    @PutMapping("/api/clientas/{id}")
    public ResponseEntity<ClientaDto> editar(@PathVariable String id, @Valid @RequestBody DatosClienta datos) {
        return ResponseEntity.ok(servicio.editar(id, datos));
    }

    @Operation(summary = "Borrar una clienta recién creada (Deshacer de una anotación, D-11)",
            description = "409 si se creó hace más de 10 minutos: después, una clienta solo se desactiva.")
    @DeleteMapping("/api/clientas/{id}")
    public ResponseEntity<Void> borrarRecienCreada(@PathVariable String id) {
        servicio.borrarRecienCreada(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Desactivar o reactivar (solo Admin)")
    @PatchMapping("/api/clientas/{id}/activa")
    public ResponseEntity<ClientaDto> cambiarActiva(@PathVariable String id, @Valid @RequestBody CambioActiva datos) {
        return ResponseEntity.ok(servicio.cambiarActiva(id, datos.activa()));
    }

    @Operation(summary = "Días sin comprar para que una clienta cuente como inactiva")
    @GetMapping("/api/configuracion/dias-inactividad")
    public ResponseEntity<DiasInactividad> diasInactividad() {
        return ResponseEntity.ok(new DiasInactividad(servicio.diasInactividad()));
    }

    @Operation(summary = "Cambiar los días de inactividad (solo Admin, 1 a 365)")
    @PutMapping("/api/configuracion/dias-inactividad")
    public ResponseEntity<DiasInactividad> cambiarDiasInactividad(@Valid @RequestBody DiasInactividad datos) {
        return ResponseEntity.ok(new DiasInactividad(servicio.cambiarDiasInactividad(datos.dias())));
    }
}
