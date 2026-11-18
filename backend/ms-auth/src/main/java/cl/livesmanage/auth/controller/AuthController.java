package cl.livesmanage.auth.controller;

import cl.livesmanage.auth.dto.CambioContrasena;
import cl.livesmanage.auth.dto.LoginRequest;
import cl.livesmanage.auth.dto.LoginResponse;
import cl.livesmanage.auth.dto.UsuarioDto;
import cl.livesmanage.auth.service.AuthService;
import cl.livesmanage.auth.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UsuarioService usuarioService;

    @Operation(summary = "Iniciar sesión (RF-01)",
            description = "401 con un mensaje genérico si el correo no existe, la contraseña no coincide o el usuario está desactivado.")
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest datos) {
        return ResponseEntity.ok(authService.login(datos));
    }

    @Operation(summary = "Cambiar mi contraseña (D-49)", description = "400 si la contraseña actual no coincide.")
    @SecurityRequirement(name = "jwt")
    @PutMapping("/contrasena")
    public ResponseEntity<Void> cambiarContrasena(@Valid @RequestBody CambioContrasena datos, @AuthenticationPrincipal Jwt jwt) {
        usuarioService.cambiarContrasena(jwt.getSubject(), datos);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Usuario de la sesión, con sus datos al día")
    @SecurityRequirement(name = "jwt")
    @GetMapping("/yo")
    public ResponseEntity<UsuarioDto> yo(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(authService.usuarioActual(jwt.getSubject()));
    }
}
