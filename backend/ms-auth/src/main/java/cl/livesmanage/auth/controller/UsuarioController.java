package cl.livesmanage.auth.controller;

import cl.livesmanage.auth.dto.CambioActivo;
import cl.livesmanage.auth.dto.EdicionUsuario;
import cl.livesmanage.auth.dto.NuevoUsuario;
import cl.livesmanage.auth.dto.UsuarioDto;
import cl.livesmanage.auth.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** RF-03. Solo la Admin (SeguridadConfig); a una Vendedora le responde 403 (RF-02). */
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@SecurityRequirement(name = "jwt")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @Operation(summary = "Listar usuarios, ordenados por nombre")
    @GetMapping
    public ResponseEntity<List<UsuarioDto>> listar(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(usuarioService.listar(jwt.getSubject()));
    }

    @Operation(summary = "Crear un usuario con su contraseña inicial", description = "409 si el correo ya existe.")
    @PostMapping
    public ResponseEntity<UsuarioDto> crear(@Valid @RequestBody NuevoUsuario datos, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.crear(datos, jwt.getSubject()));
    }

    @Operation(summary = "Editar nombre, correo y rol", description = "409 si el correo ya existe o si la Admin intenta cambiar su propio rol.")
    @PutMapping("/{id}")
    public ResponseEntity<UsuarioDto> editar(@PathVariable String id, @Valid @RequestBody EdicionUsuario datos, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(usuarioService.editar(id, datos, jwt.getSubject()));
    }

    @Operation(summary = "Desactivar o reactivar", description = "409 si la Admin intenta desactivarse a sí misma.")
    @PatchMapping("/{id}/activo")
    public ResponseEntity<UsuarioDto> cambiarActivo(@PathVariable String id, @Valid @RequestBody CambioActivo datos, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(usuarioService.cambiarActivo(id, datos.activo(), jwt.getSubject()));
    }
}
