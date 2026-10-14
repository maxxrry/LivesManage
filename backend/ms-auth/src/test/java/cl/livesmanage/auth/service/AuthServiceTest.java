package cl.livesmanage.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import cl.livesmanage.auth.dto.LoginRequest;
import cl.livesmanage.auth.dto.LoginResponse;
import cl.livesmanage.auth.exception.CredencialesInvalidasException;
import cl.livesmanage.auth.exception.SesionInvalidaException;
import cl.livesmanage.auth.model.Rol;
import cl.livesmanage.auth.model.Usuario;
import cl.livesmanage.auth.repository.UsuarioRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    // Costo bajo para que las pruebas sean rápidas; la aplicación usa 12.
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);

    @Mock
    private UsuarioRepository repositorio;

    @Mock
    private JwtService jwtService;

    private AuthService servicio;
    private Usuario vendedora;

    @BeforeEach
    void preparar() {
        servicio = new AuthService(repositorio, encoder, jwtService);
        vendedora = new Usuario();
        vendedora.setId("u-2");
        vendedora.setNombre("Vendedora");
        vendedora.setCorreo("vendedora@livesmanage.cl");
        vendedora.setContrasenaHash(encoder.encode("vende1234"));
        vendedora.setRol(Rol.VENDEDOR);
        vendedora.setActivo(true);
    }

    @Test
    void conCredencialesValidasEntregaTokenYUsuario() {
        when(repositorio.findByCorreo("vendedora@livesmanage.cl")).thenReturn(Optional.of(vendedora));
        when(jwtService.emitir(any())).thenReturn("token-firmado");

        LoginResponse respuesta = servicio.login(new LoginRequest("vendedora@livesmanage.cl", "vende1234"));

        assertThat(respuesta.token()).isEqualTo("token-firmado");
        assertThat(respuesta.usuario().id()).isEqualTo("u-2");
        assertThat(respuesta.usuario().rol()).isEqualTo(Rol.VENDEDOR);
        assertThat(respuesta.usuario().activo()).isTrue();
    }

    @Test
    void elCorreoSeComparaSinMayusculasNiEspacios() {
        when(repositorio.findByCorreo("vendedora@livesmanage.cl")).thenReturn(Optional.of(vendedora));
        when(jwtService.emitir(any())).thenReturn("token-firmado");

        LoginResponse respuesta = servicio.login(new LoginRequest("  Vendedora@LivesManage.cl ", "vende1234"));

        assertThat(respuesta.usuario().correo()).isEqualTo("vendedora@livesmanage.cl");
    }

    @Test
    void contrasenaIncorrectaSeRechaza() {
        when(repositorio.findByCorreo("vendedora@livesmanage.cl")).thenReturn(Optional.of(vendedora));

        assertThatThrownBy(() -> servicio.login(new LoginRequest("vendedora@livesmanage.cl", "otra")))
                .isInstanceOf(CredencialesInvalidasException.class);
    }

    @Test
    void correoInexistenteSeRechazaConElMismoError() {
        when(repositorio.findByCorreo("nadie@livesmanage.cl")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.login(new LoginRequest("nadie@livesmanage.cl", "vende1234")))
                .isInstanceOf(CredencialesInvalidasException.class);
    }

    @Test
    void usuarioDesactivadoNoEntraAunqueLaContrasenaSeaCorrecta() {
        vendedora.setActivo(false);
        when(repositorio.findByCorreo("vendedora@livesmanage.cl")).thenReturn(Optional.of(vendedora));

        assertThatThrownBy(() -> servicio.login(new LoginRequest("vendedora@livesmanage.cl", "vende1234")))
                .isInstanceOf(CredencialesInvalidasException.class);
    }

    @Test
    void contrasenaDeMasDe72BytesSeRechazaSinError500() {
        // BCrypt solo acepta 72 bytes: 40 "ñ" son 80 bytes.
        assertThatThrownBy(() -> servicio.login(new LoginRequest("vendedora@livesmanage.cl", "ñ".repeat(40))))
                .isInstanceOf(CredencialesInvalidasException.class);
    }

    @Test
    void usuarioActualDevuelveLosDatosAlDia() {
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));

        assertThat(servicio.usuarioActual("u-2").nombre()).isEqualTo("Vendedora");
    }

    @Test
    void usuarioActualDesactivadoInvalidaLaSesion() {
        vendedora.setActivo(false);
        when(repositorio.findById("u-2")).thenReturn(Optional.of(vendedora));

        assertThatThrownBy(() -> servicio.usuarioActual("u-2")).isInstanceOf(SesionInvalidaException.class);
    }
}
