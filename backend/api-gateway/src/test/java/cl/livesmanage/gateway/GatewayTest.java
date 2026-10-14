package cl.livesmanage.gateway;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Enrutamiento, JWT, CORS y límite de intentos, contra un ms-auth falso. */
@SpringBootTest
@AutoConfigureMockMvc
class GatewayTest {

    private static final String SECRETO = "clave-solo-para-pruebas-de-al-menos-32-caracteres";
    private static final HttpServer MS_AUTH_FALSO = iniciarMsAuthFalso();

    @Autowired
    private MockMvc mvc;

    /** Responde como ms-auth: login 401 si la contraseña es "mala"; /yo devuelve el header Authorization que le llegó. */
    private static HttpServer iniciarMsAuthFalso() {
        try {
            HttpServer servidor = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            servidor.createContext("/api/auth/login", intercambio -> {
                String cuerpo = new String(intercambio.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                if (cuerpo.contains("mala")) {
                    responder(intercambio, 401, "{\"mensaje\":\"Correo o contraseña incorrectos.\"}");
                } else {
                    responder(intercambio, 200, "{\"token\":\"t\"}");
                }
            });
            servidor.createContext("/api/clientas", intercambio -> responder(intercambio, 200, "[]"));
            servidor.createContext("/api/lives", intercambio -> responder(intercambio, 200, "[]"));
            servidor.createContext("/api/configuracion", intercambio -> responder(intercambio, 200, "{\"dias\":60}"));
            servidor.createContext("/api/auth/yo", intercambio ->
                    responder(intercambio, 200, "{\"recibido\":\"" + intercambio.getRequestHeaders().getFirst("Authorization") + "\"}"));
            servidor.start();
            return servidor;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void responder(HttpExchange intercambio, int estado, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        intercambio.getResponseHeaders().add("Content-Type", "application/json");
        intercambio.sendResponseHeaders(estado, bytes.length);
        intercambio.getResponseBody().write(bytes);
        intercambio.close();
    }

    @DynamicPropertySource
    static void propiedades(DynamicPropertyRegistry registro) {
        registro.add("AUTH_URL", () -> "http://localhost:" + MS_AUTH_FALSO.getAddress().getPort());
        registro.add("CLIENTAS_URL", () -> "http://localhost:" + MS_AUTH_FALSO.getAddress().getPort());
        registro.add("LIVES_URL", () -> "http://localhost:" + MS_AUTH_FALSO.getAddress().getPort());
        registro.add("JWT_SECRET", () -> SECRETO);
    }

    @AfterAll
    static void detener() {
        MS_AUTH_FALSO.stop(0);
    }

    private static String token(String emisor) {
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(SECRETO.getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(emisor).subject("u-1").claim("rol", "ADMIN").issuedAt(ahora).expiresAt(ahora.plusSeconds(60)).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    private static RequestPostProcessor desdeIp(String ip) {
        return peticion -> {
            peticion.setRemoteAddr(ip);
            return peticion;
        };
    }

    @Test
    void elLoginPasaSinTokenYLlegaAMsAuth() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":\"buena\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("t"));
    }

    @Test
    void sinTokenResponde401ConMensajeYNoLlegaAlServicio() throws Exception {
        mvc.perform(get("/api/auth/yo"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Tu sesión expiró o no es válida. Vuelve a iniciar sesión."));
    }

    @Test
    void conTokenValidoReenviaLaPeticionConSuToken() throws Exception {
        String token = token("ms-auth");
        mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recibido").value("Bearer " + token));
    }

    @Test
    void lasClientasVanAMsClientasConToken() throws Exception {
        mvc.perform(get("/api/clientas").header("Authorization", "Bearer " + token("ms-auth"))).andExpect(status().isOk());
        mvc.perform(get("/api/configuracion/dias-inactividad").header("Authorization", "Bearer " + token("ms-auth")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(60));
        mvc.perform(get("/api/clientas")).andExpect(status().isUnauthorized());
    }

    @Test
    void losLivesVanAMsLivesConToken() throws Exception {
        mvc.perform(get("/api/lives").header("Authorization", "Bearer " + token("ms-auth"))).andExpect(status().isOk());
        mvc.perform(get("/api/lives")).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenDeOtroEmisorSeRechaza() throws Exception {
        mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + token("otro")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void corsAceptaAlFrontendYRechazaOtrosOrigenes() throws Exception {
        mvc.perform(options("/api/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));

        mvc.perform(options("/api/auth/login")
                        .header("Origin", "https://otro-sitio.com")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void losLoginsCorrectosNoCuentanComoFallidos() throws Exception {
        for (int i = 0; i < 15; i++) {
            mvc.perform(post("/api/auth/login").with(desdeIp("10.0.0.20"))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":\"buena\"}"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void trasDiezLoginsFallidosLaMismaIpRecibe429() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/login").with(desdeIp("10.0.0.9"))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":\"mala\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").with(desdeIp("10.0.0.9"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":\"buena\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.mensaje").value("Demasiados intentos. Espera unos minutos y vuelve a intentar."));

        // Codificar la ruta no evita el límite.
        mvc.perform(post(URI.create("/api/auth/logi%6E")).with(desdeIp("10.0.0.9"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":\"buena\"}"))
                .andExpect(status().isTooManyRequests());

        // Otra IP no queda bloqueada.
        mvc.perform(post("/api/auth/login").with(desdeIp("10.0.0.10"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":\"buena\"}"))
                .andExpect(status().isOk());
    }
}
