package cl.livesmanage.auth.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cl.livesmanage.auth.model.Rol;
import cl.livesmanage.auth.model.Usuario;
import cl.livesmanage.auth.repository.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** RF-01 de punta a punta: H2 en memoria con la Admin inicial de application-test.yml. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    private String login(String correo, String contrasena) {
        return "{\"correo\":\"" + correo + "\",\"contrasena\":\"" + contrasena + "\"}";
    }

    private String tokenDeLaAdmin() throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("admin@livesmanage.cl", "admin1234")))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(cuerpo, "$.token");
    }

    @Test
    void conCredencialesValidasEntregaTokenYUsuarioSinContrasena() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("Admin@LivesManage.cl", "admin1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.usuario.correo").value("admin@livesmanage.cl"))
                .andExpect(jsonPath("$.usuario.rol").value("ADMIN"))
                .andExpect(jsonPath("$.usuario.activo").value(true))
                .andExpect(jsonPath("$.usuario.contrasenaHash").doesNotExist());
    }

    @Test
    void conContrasenaIncorrectaRespondeMensajeGenerico() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("admin@livesmanage.cl", "otra-clave")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos."));
    }

    @Test
    void conCorreoInvalidoRespondeErrorDelCampo() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("no-es-correo", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.correo").value("Ingresa un correo válido."))
                .andExpect(jsonPath("$.campos.contrasena").value("Ingresa tu contraseña."));
    }

    @Test
    void swaggerEstaDisponibleSinToken() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/login']").exists());
    }

    @Test
    void correoConEspaciosYMayusculasEntra() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("  Admin@LivesManage.cl ", "admin1234")))
                .andExpect(status().isOk());
    }

    @Test
    void usuarioDesactivadoRecibeElMensajeGenerico() throws Exception {
        Usuario exVendedora = new Usuario();
        exVendedora.setNombre("Ex vendedora");
        exVendedora.setCorreo("antigua@livesmanage.cl");
        exVendedora.setContrasenaHash(encoder.encode("antigua123"));
        exVendedora.setRol(Rol.VENDEDOR);
        exVendedora.setActivo(false);
        repositorio.save(exVendedora);

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("antigua@livesmanage.cl", "antigua123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos."));
    }

    @Test
    void contrasenaDeMasDe72BytesRecibeElMensajeGenerico() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("admin@livesmanage.cl", "a".repeat(80))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos."));
    }

    @Test
    void tipoDeContenidoEquivocadoNoEsError500() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.TEXT_PLAIN).content("hola"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.mensaje").isString());
    }

    @Test
    void yoSinTokenResponde401ConMensaje() throws Exception {
        mvc.perform(get("/api/auth/yo"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Tu sesión expiró o no es válida. Vuelve a iniciar sesión."));
    }

    @Test
    void yoConTokenDeOtroEmisorResponde401() throws Exception {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("otro-servicio").subject("u-1").issuedAt(ahora).expiresAt(ahora.plusSeconds(60)).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void yoConTokenAlteradoResponde401() throws Exception {
        mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + tokenDeLaAdmin() + "x"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void yoConElTokenDelLoginDevuelveAlUsuario() throws Exception {
        mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + tokenDeLaAdmin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correo").value("admin@livesmanage.cl"))
                .andExpect(jsonPath("$.rol").value("ADMIN"));
    }
}
