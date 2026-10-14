package cl.livesmanage.auth.config;

import cl.livesmanage.auth.model.Rol;
import cl.livesmanage.auth.model.Usuario;
import cl.livesmanage.auth.repository.UsuarioRepository;
import cl.livesmanage.auth.service.AuthService;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Con la base vacía nadie podría entrar: crea la primera Admin con ADMIN_CORREO y ADMIN_CONTRASENA. */
@Slf4j
@Component
public class AdminInicial implements ApplicationRunner {

    private final UsuarioRepository repositorio;
    private final PasswordEncoder encoder;
    private final String nombre;
    private final String correo;
    private final String contrasena;

    public AdminInicial(
            UsuarioRepository repositorio,
            PasswordEncoder encoder,
            @Value("${livesmanage.admin-inicial.nombre}") String nombre,
            @Value("${livesmanage.admin-inicial.correo}") String correo,
            @Value("${livesmanage.admin-inicial.contrasena}") String contrasena) {
        this.repositorio = repositorio;
        this.encoder = encoder;
        this.nombre = nombre;
        this.correo = correo;
        this.contrasena = contrasena;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repositorio.count() > 0) {
            return;
        }
        if (correo.isBlank()) {
            log.warn("No hay usuarios: define ADMIN_CORREO y ADMIN_CONTRASENA para crear la primera Admin.");
            return;
        }
        int bytes = contrasena.getBytes(StandardCharsets.UTF_8).length;
        if (!correo.contains("@") || contrasena.length() < 8 || bytes > 72) {
            throw new IllegalStateException("ADMIN_CORREO debe ser un correo y ADMIN_CONTRASENA tener entre 8 caracteres y 72 bytes.");
        }
        Usuario admin = new Usuario();
        admin.setNombre(nombre);
        admin.setCorreo(AuthService.normalizarCorreo(correo));
        admin.setContrasenaHash(encoder.encode(contrasena));
        admin.setRol(Rol.ADMIN);
        repositorio.save(admin);
        log.info("Admin inicial creada: usuario {}", admin.getId());
    }
}
