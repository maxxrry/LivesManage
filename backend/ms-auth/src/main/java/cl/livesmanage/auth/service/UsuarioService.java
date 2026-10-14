package cl.livesmanage.auth.service;

import cl.livesmanage.auth.dto.EdicionUsuario;
import cl.livesmanage.auth.dto.NuevoUsuario;
import cl.livesmanage.auth.dto.UsuarioDto;
import cl.livesmanage.auth.exception.ReglaException;
import cl.livesmanage.auth.model.Rol;
import cl.livesmanage.auth.model.Usuario;
import cl.livesmanage.auth.repository.UsuarioRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * RF-03: la Admin crea, edita y desactiva usuarios. Nunca se borran.
 * Nadie se desactiva ni se cambia el rol a sí mismo: así siempre queda al menos una Admin activa (D-35).
 * Cada operación revisa en la base que quien la pide siga siendo Admin activa: el rol del JWT puede tener hasta 8 horas.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository repositorio;
    private final PasswordEncoder encoder;

    @Transactional(readOnly = true)
    public List<UsuarioDto> listar(String idQuienPide) {
        exigirAdminActiva(idQuienPide);
        return repositorio.findAll(Sort.by("nombre")).stream().map(UsuarioDto::de).toList();
    }

    @Transactional
    public UsuarioDto crear(NuevoUsuario datos, String idQuienCrea) {
        exigirAdminActiva(idQuienCrea);
        if (datos.contrasena().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ReglaException(HttpStatus.BAD_REQUEST, "contrasena", "La contraseña es demasiado larga (máximo 72 caracteres).");
        }
        if (repositorio.existsByCorreo(datos.correo())) {
            throw ReglaException.correoRepetido();
        }
        Usuario usuario = new Usuario();
        usuario.setNombre(datos.nombre());
        usuario.setCorreo(datos.correo());
        usuario.setRol(datos.rol());
        usuario.setContrasenaHash(encoder.encode(datos.contrasena()));
        usuario = repositorio.saveAndFlush(usuario);
        log.info("Usuario {} creado con rol {}", usuario.getId(), usuario.getRol());
        return UsuarioDto.de(usuario);
    }

    @Transactional
    public UsuarioDto editar(String id, EdicionUsuario datos, String idQuienEdita) {
        exigirAdminActiva(idQuienEdita);
        Usuario usuario = buscar(id);
        if (id.equals(idQuienEdita) && datos.rol() != usuario.getRol()) {
            throw new ReglaException(HttpStatus.CONFLICT, "rol", "No puedes cambiar tu propio rol.");
        }
        if (!datos.correo().equals(usuario.getCorreo()) && repositorio.existsByCorreo(datos.correo())) {
            throw ReglaException.correoRepetido();
        }
        usuario.setNombre(datos.nombre());
        usuario.setCorreo(datos.correo());
        usuario.setRol(datos.rol());
        repositorio.flush(); // un correo repetido por carrera sale aquí como 409, no al confirmar la transacción
        log.info("Usuario {} editado", id);
        return UsuarioDto.de(usuario);
    }

    @Transactional
    public UsuarioDto cambiarActivo(String id, boolean activo, String idQuienEdita) {
        exigirAdminActiva(idQuienEdita);
        Usuario usuario = buscar(id);
        if (id.equals(idQuienEdita) && !activo) {
            throw new ReglaException(HttpStatus.CONFLICT, null, "No puedes desactivar tu propia cuenta.");
        }
        usuario.setActivo(activo);
        log.info("Usuario {} {}", id, activo ? "reactivado" : "desactivado");
        return UsuarioDto.de(usuario);
    }

    /** Una Admin desactivada o pasada a Vendedora pierde el acceso al instante, aunque su token diga ADMIN. */
    private void exigirAdminActiva(String id) {
        boolean esAdminActiva = repositorio.findById(id).filter(u -> u.isActivo() && u.getRol() == Rol.ADMIN).isPresent();
        if (!esAdminActiva) {
            throw new ReglaException(HttpStatus.FORBIDDEN, null, "No tienes permiso para hacer esto.");
        }
    }

    private Usuario buscar(String id) {
        return repositorio.findById(id).orElseThrow(ReglaException::noEncontrado);
    }
}
