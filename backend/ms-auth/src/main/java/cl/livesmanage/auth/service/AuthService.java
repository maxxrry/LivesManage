package cl.livesmanage.auth.service;

import cl.livesmanage.auth.dto.LoginRequest;
import cl.livesmanage.auth.dto.LoginResponse;
import cl.livesmanage.auth.dto.UsuarioDto;
import cl.livesmanage.auth.exception.CredencialesInvalidasException;
import cl.livesmanage.auth.exception.SesionInvalidaException;
import cl.livesmanage.auth.model.Usuario;
import cl.livesmanage.auth.repository.UsuarioRepository;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** RF-01: inicio de sesión y usuario actual. */
@Slf4j
@Service
public class AuthService {

    /** Límite de BCrypt: lo que pase de 72 bytes no se puede comparar. */
    private static final int MAX_BYTES_CONTRASENA = 72;

    private final UsuarioRepository repositorio;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    /** Se compara contra este hash cuando el correo no existe, para que el tiempo de respuesta no revele qué correos existen. */
    private final String hashDeRelleno;

    public AuthService(UsuarioRepository repositorio, PasswordEncoder encoder, JwtService jwtService) {
        this.repositorio = repositorio;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.hashDeRelleno = encoder.encode("relleno-sin-usuario");
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest datos) {
        if (datos.contrasena().getBytes(StandardCharsets.UTF_8).length > MAX_BYTES_CONTRASENA) {
            throw new CredencialesInvalidasException();
        }
        Optional<Usuario> usuario = repositorio.findByCorreo(normalizarCorreo(datos.correo()));
        boolean coincide = encoder.matches(datos.contrasena(), usuario.map(Usuario::getContrasenaHash).orElse(hashDeRelleno));
        if (usuario.isEmpty() || !coincide || !usuario.get().isActivo()) {
            log.info("Inicio de sesión rechazado");
            throw new CredencialesInvalidasException();
        }
        log.info("Inicio de sesión del usuario {}", usuario.get().getId());
        return new LoginResponse(jwtService.emitir(usuario.get()), UsuarioDto.de(usuario.get()));
    }

    /** Datos al día del usuario del token: un cambio de rol o una desactivación se notan sin volver a entrar (D-31). */
    @Transactional(readOnly = true)
    public UsuarioDto usuarioActual(String id) {
        return repositorio.findById(id)
                .filter(Usuario::isActivo)
                .map(UsuarioDto::de)
                .orElseThrow(SesionInvalidaException::new);
    }

    public static String normalizarCorreo(String correo) {
        return correo.trim().toLowerCase(Locale.ROOT);
    }
}
