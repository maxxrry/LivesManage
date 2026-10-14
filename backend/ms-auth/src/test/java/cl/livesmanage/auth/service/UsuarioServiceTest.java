package cl.livesmanage.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import cl.livesmanage.auth.dto.EdicionUsuario;
import cl.livesmanage.auth.dto.NuevoUsuario;
import cl.livesmanage.auth.dto.UsuarioDto;
import cl.livesmanage.auth.exception.ReglaException;
import cl.livesmanage.auth.model.Rol;
import cl.livesmanage.auth.model.Usuario;
import cl.livesmanage.auth.repository.UsuarioRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);

    @Mock
    private UsuarioRepository repositorio;

    private UsuarioService servicio;
    private Usuario vendedora;

    @BeforeEach
    void preparar() {
        servicio = new UsuarioService(repositorio, encoder);
        vendedora = new Usuario();
        vendedora.setId("u-2");
        vendedora.setNombre("Vendedora");
        vendedora.setCorreo("vendedora@livesmanage.cl");
        vendedora.setContrasenaHash("hash");
        vendedora.setRol(Rol.VENDEDOR);
        vendedora.setActivo(true);
        Usuario admin = new Usuario();
        admin.setId("u-1");
        admin.setRol(Rol.ADMIN);
        admin.setActivo(true);
        lenient().when(repositorio.findById("u-1")).thenReturn(Optional.of(admin));
    }

    private static HttpStatus estadoDe(Throwable e) {
        return ((ReglaException) e).getEstado();
    }

    @Test
    void crearGuardaLaContrasenaCifradaYElCorreoNormalizado() {
        when(repositorio.existsByCorreo("nueva@livesmanage.cl")).thenReturn(false);
        when(repositorio.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        UsuarioDto creado = servicio.crear(new NuevoUsuario(" Nueva ", " Nueva@LivesManage.cl ", Rol.VENDEDOR, "inicial123"), "u-1");

        assertThat(creado.nombre()).isEqualTo("Nueva");
        assertThat(creado.correo()).isEqualTo("nueva@livesmanage.cl");
        assertThat(creado.activo()).isTrue();
    }

    @Test
    void crearConUnCorreoRepetidoSeRechaza() {
        when(repositorio.existsByCorreo("vendedora@livesmanage.cl")).thenReturn(true);

        assertThatThrownBy(() -> servicio.crear(new NuevoUsuario("Otra", "vendedora@livesmanage.cl", Rol.VENDEDOR, "inicial123"), "u-1"))
                .isInstanceOf(ReglaException.class)
                .hasMessage("Ya existe un usuario con ese correo.")
                .satisfies(e -> assertThat(estadoDe(e)).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void crearConContrasenaDeMasDe72BytesSeRechaza() {
        assertThatThrownBy(() -> servicio.crear(new NuevoUsuario("Otra", "otra@livesmanage.cl", Rol.VENDEDOR, "ñ".repeat(40)), "u-1"))
                .isInstanceOf(ReglaException.class)
                .satisfies(e -> assertThat(((ReglaException) e).getCampo()).isEqualTo("contrasena"));
    }

    @Test
    void editarCambiaNombreCorreoYRol() {
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));
        when(repositorio.existsByCorreo("vende@livesmanage.cl")).thenReturn(false);

        UsuarioDto editado = servicio.editar("u-2", new EdicionUsuario("Vende", "vende@livesmanage.cl", Rol.ADMIN), "u-1");

        assertThat(editado.nombre()).isEqualTo("Vende");
        assertThat(editado.correo()).isEqualTo("vende@livesmanage.cl");
        assertThat(editado.rol()).isEqualTo(Rol.ADMIN);
    }

    @Test
    void editarSinCambiarElCorreoNoLoCuentaComoRepetido() {
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));

        UsuarioDto editado = servicio.editar("u-2", new EdicionUsuario("Vende", "vendedora@livesmanage.cl", Rol.VENDEDOR), "u-1");

        assertThat(editado.nombre()).isEqualTo("Vende");
    }

    @Test
    void editarAUnCorreoDeOtroUsuarioSeRechaza() {
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));
        when(repositorio.existsByCorreo("admin@livesmanage.cl")).thenReturn(true);

        assertThatThrownBy(() -> servicio.editar("u-2", new EdicionUsuario("Vende", "admin@livesmanage.cl", Rol.VENDEDOR), "u-1"))
                .satisfies(e -> assertThat(estadoDe(e)).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void nadieCambiaSuPropioRol() {
        vendedora.setRol(Rol.ADMIN);
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));

        assertThatThrownBy(() -> servicio.editar("u-2", new EdicionUsuario("Yo", "vendedora@livesmanage.cl", Rol.VENDEDOR), "u-2"))
                .hasMessage("No puedes cambiar tu propio rol.")
                .satisfies(e -> assertThat(((ReglaException) e).getCampo()).isEqualTo("rol"));
    }

    @Test
    void desactivarYReactivarAOtroUsuario() {
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));

        assertThat(servicio.cambiarActivo("u-2", false, "u-1").activo()).isFalse();
        assertThat(servicio.cambiarActivo("u-2", true, "u-1").activo()).isTrue();
    }

    @Test
    void nadieSeDesactivaASiMismo() {
        vendedora.setRol(Rol.ADMIN);
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));

        assertThatThrownBy(() -> servicio.cambiarActivo("u-2", false, "u-2"))
                .hasMessage("No puedes desactivar tu propia cuenta.")
                .satisfies(e -> assertThat(estadoDe(e)).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void unUsuarioQueNoExisteResponde404() {
        when(repositorio.findById("u-9")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.cambiarActivo("u-9", false, "u-1"))
                .satisfies(e -> assertThat(estadoDe(e)).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void unaAdminDesactivadaODegradadaNoGestionaAunqueSuTokenDigaAdmin() {
        vendedora.setRol(Rol.ADMIN);
        vendedora.setActivo(false);
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));

        assertThatThrownBy(() -> servicio.listar("u-2")).satisfies(e -> assertThat(estadoDe(e)).isEqualTo(HttpStatus.FORBIDDEN));

        vendedora.setActivo(true);
        vendedora.setRol(Rol.VENDEDOR);
        assertThatThrownBy(() -> servicio.cambiarActivo("u-1", false, "u-2"))
                .satisfies(e -> assertThat(estadoDe(e)).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
