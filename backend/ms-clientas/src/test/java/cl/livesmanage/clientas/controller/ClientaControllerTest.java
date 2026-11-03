package cl.livesmanage.clientas.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import cl.livesmanage.clientas.dto.CompraClienta;
import cl.livesmanage.clientas.dto.ResumenCompras;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
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
import cl.livesmanage.clientas.cliente.LivesCliente;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** RF-12 de punta a punta con H2 y tokens firmados como los de ms-auth (misma clave de application-test.yml). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClientaControllerTest {

    private static final String SECRETO = "clave-solo-para-pruebas-de-al-menos-32-caracteres";
    private static final String ADMIN = "Bearer " + token("ADMIN");
    private static final String VENDEDORA = "Bearer " + token("VENDEDOR");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private LivesCliente lives;

    private static String token(String rol) {
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(SECRETO.getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("ms-auth").subject("u-" + rol).claim("rol", rol).issuedAt(ahora).expiresAt(ahora.plusSeconds(3600)).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    private ResultActions crear(String token, String json) throws Exception {
        return mvc.perform(post("/api/clientas").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String idDe(ResultActions resultado) throws Exception {
        return JsonPath.read(resultado.andReturn().getResponse().getContentAsString(), "$.id");
    }

    /** Usuario de TikTok distinto en cada prueba: comparten la misma base H2. */
    private static String tiktokNuevo() {
        return "@prueba" + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void sinTokenResponde401() throws Exception {
        mvc.perform(get("/api/clientas"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Tu sesión expiró o no es válida. Vuelve a iniciar sesión."));
    }

    @Test
    void unaVendedoraRegistraUnaClientaYLaVeEnSuFicha() throws Exception {
        String id = idDe(crear(VENDEDORA, """
                {"nombre":"  Javiera   Soto ","usuarioTiktok":" @JaviSoto ","telefono":"",
                 "direccion":{"calle":"Los Aromos 1234","comuna":"Maipú","region":""}}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Javiera Soto"))
                .andExpect(jsonPath("$.usuarioTiktok").value("@javisoto"))
                .andExpect(jsonPath("$.telefono").doesNotExist())
                .andExpect(jsonPath("$.direccion.region").value("Metropolitana"))
                .andExpect(jsonPath("$.activa").value(true)));

        mvc.perform(get("/api/clientas/" + id).header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.direccion.comuna").value("Maipú"));
        mvc.perform(get("/api/clientas").header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + id + "')].nombre").value("Javiera Soto"));
    }

    @Test
    void soloElNombreEsObligatorioYLaDireccionExigeCalleYComuna() throws Exception {
        crear(VENDEDORA, "{\"nombre\":\"Flo\"}").andExpect(status().isCreated());

        crear(VENDEDORA, "{\"nombre\":\" \"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Falta el nombre de la clienta."));
        crear(VENDEDORA, "{\"nombre\":\"Flo\",\"direccion\":{\"calle\":\"Los Aromos 1234\",\"comuna\":\"\"}}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Falta la comuna de la dirección."));
    }

    @Test
    void unTiktokDe60CaracteresSinArrobaCabeConElArrobaAgregado() throws Exception {
        String usuario = UUID.randomUUID().toString().replace("-", "") + "x".repeat(28); // 60 caracteres
        crear(VENDEDORA, "{\"nombre\":\"Larga\",\"usuarioTiktok\":\"" + usuario + "\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuarioTiktok").value("@" + usuario));
    }

    @Test
    void editarBorraLosCamposVacios() throws Exception {
        String tiktok = tiktokNuevo();
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Flo\",\"usuarioTiktok\":\"" + tiktok + "\",\"telefono\":\"+56 9 1111 2222\"}"));

        mvc.perform(put("/api/clientas/" + id).header("Authorization", VENDEDORA)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Florencia\",\"usuarioTiktok\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Florencia"))
                .andExpect(jsonPath("$.usuarioTiktok").doesNotExist())
                .andExpect(jsonPath("$.telefono").doesNotExist());
    }

    @Test
    void duplicadosAvisaQuienTieneElTiktokYExcluyeALaMisma() throws Exception {
        String tiktok = tiktokNuevo();
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Gabriela\",\"usuarioTiktok\":\"" + tiktok + "\"}"));

        mvc.perform(get("/api/clientas/duplicados").header("Authorization", VENDEDORA)
                        .param("usuarioTiktok", tiktok.substring(1).toUpperCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tiktok.id").value(id))
                .andExpect(jsonPath("$.telefono").doesNotExist());
        mvc.perform(get("/api/clientas/duplicados").header("Authorization", VENDEDORA)
                        .param("usuarioTiktok", tiktok).param("excluirId", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tiktok").doesNotExist());
    }

    @Test
    void soloLaAdminDesactiva() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Camila\"}"));

        mvc.perform(patch("/api/clientas/" + id + "/activa").header("Authorization", VENDEDORA)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activa\":false}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("No tienes permiso para hacer esto."));
        mvc.perform(patch("/api/clientas/" + id + "/activa").header("Authorization", ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activa\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activa").value(false));
    }

    @Test
    void losDiasDeInactividadLosCambiaSoloLaAdminEntre1Y365() throws Exception {
        mvc.perform(get("/api/configuracion/dias-inactividad").header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").isNumber());
        mvc.perform(put("/api/configuracion/dias-inactividad").header("Authorization", VENDEDORA)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"dias\":90}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/configuracion/dias-inactividad").header("Authorization", ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"dias\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Los días deben ser un número entero entre 1 y 365."));
        mvc.perform(put("/api/configuracion/dias-inactividad").header("Authorization", ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"dias\":90}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(90));
    }

    @Test
    void unaClientaRecienCreadaSePuedeBorrar() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"flo 6\"}"));

        mvc.perform(delete("/api/clientas/" + id).header("Authorization", VENDEDORA)).andExpect(status().isNoContent());
        mvc.perform(get("/api/clientas/" + id).header("Authorization", VENDEDORA)).andExpect(status().isNotFound());
    }

    @Test
    void unaClientaQueNoExisteResponde404() throws Exception {
        mvc.perform(get("/api/clientas/no-existe").header("Authorization", VENDEDORA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("La clienta no existe."));
    }

    @Test
    void editarAvisaAMsLivesDespuesDeGuardar() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Flo\"}"));
        verify(lives, never()).sincronizarNombre(anyString()); // crear no: aún no tiene líneas

        mvc.perform(put("/api/clientas/" + id).header("Authorization", VENDEDORA).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Florencia  Ruiz\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Florencia Ruiz"));
        verify(lives).sincronizarNombre(id);
    }

    @Test
    void elDespachoGuardaLaDireccionEnLaFicha() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Gabi\"}"));

        mvc.perform(put("/api/clientas/" + id + "/direccion").header("Authorization", VENDEDORA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"calle\":\"Los Aromos 1234\",\"comuna\":\"Maipú\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Gabi"))
                .andExpect(jsonPath("$.direccion.comuna").value("Maipú"))
                .andExpect(jsonPath("$.direccion.region").value("Metropolitana"));
        mvc.perform(put("/api/clientas/" + id + "/direccion").header("Authorization", VENDEDORA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"calle\":\"Los Aromos 1234\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void swaggerEstaDisponibleSinToken() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/clientas']").exists());
    }

    // RF-14: ranking e inactivas, con ms-lives simulado

    @Test
    void elRankingOrdenaPorTotalGastadoEnElPeriodo() throws Exception {
        String flo = idDe(crear(VENDEDORA, "{\"nombre\":\"Florencia\"}"));
        String gabi = idDe(crear(VENDEDORA, "{\"nombre\":\"Gabriela\"}"));
        Instant fecha = Instant.parse("2026-10-15T23:00:00Z");
        when(lives.comprasPorClienta(LocalDate.parse("2026-10-01"), LocalDate.parse("2026-10-31")))
                .thenReturn(List.of(new ResumenCompras(flo, 10000, 1, fecha), new ResumenCompras(gabi, 17000, 2, fecha)));

        mvc.perform(get("/api/clientas/ranking").header("Authorization", VENDEDORA)
                        .param("criterio", "TOTAL").param("desde", "2026-10-01").param("hasta", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].clienta.nombre").value("Gabriela"))
                .andExpect(jsonPath("$[0].totalGastado").value(17000))
                .andExpect(jsonPath("$[0].compras").value(2))
                .andExpect(jsonPath("$[1].clienta.nombre").value("Florencia"));
    }

    @Test
    void elRankingRechazaUnCriterioOUnaFechaInvalidos() throws Exception {
        mvc.perform(get("/api/clientas/ranking").header("Authorization", VENDEDORA)
                        .param("criterio", "OTRO").param("desde", "2026-10-01").param("hasta", "2026-10-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").exists());
        mvc.perform(get("/api/clientas/ranking").header("Authorization", VENDEDORA)
                        .param("criterio", "TOTAL").param("desde", "01/10/2026").param("hasta", "2026-10-31"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/clientas/ranking").header("Authorization", VENDEDORA).param("criterio", "TOTAL"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void lasEstadisticasExigenSesion() throws Exception {
        mvc.perform(get("/api/clientas/inactivas")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/clientas/ranking")).andExpect(status().isUnauthorized());
    }

    @Test
    void unaClientaSinComprasHaceMuchoAparecComoInactivaConSuContacto() throws Exception {
        String tiktok = tiktokNuevo();
        String antigua = idDe(crear(VENDEDORA, "{\"nombre\":\"Antigua\",\"usuarioTiktok\":\"" + tiktok + "\"}"));
        String reciente = idDe(crear(VENDEDORA, "{\"nombre\":\"Reciente\"}"));
        mvc.perform(put("/api/configuracion/dias-inactividad").header("Authorization", ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"dias\":60}"))
                .andExpect(status().isOk());
        // A mediodía de Chile: restar 90 días de 24 h fallaría cerca de medianoche si en ese lapso cambia la hora.
        ZoneId chile = ZoneId.of("America/Santiago");
        Instant hace90 = LocalDate.now(chile).minusDays(90).atTime(12, 0).atZone(chile).toInstant();
        when(lives.comprasPorClienta(null, null)).thenReturn(List.of(
                new ResumenCompras(antigua, 5000, 1, hace90),
                new ResumenCompras(reciente, 5000, 1, Instant.now().minus(Duration.ofDays(10)))));

        mvc.perform(get("/api/clientas/inactivas").header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].clienta.nombre").value("Antigua"))
                .andExpect(jsonPath("$[0].clienta.usuarioTiktok").value(tiktok))
                .andExpect(jsonPath("$[0].diasSinComprar").value(90))
                .andExpect(jsonPath("$[0].ultimaCompra").exists());
    }

    @Test
    void siMsLivesNoRespondeLasEstadisticasDanUnErrorClaroYLaListaSigue() throws Exception {
        when(lives.comprasPorClienta(null, null)).thenThrow(new IllegalStateException("sin conexión"));

        mvc.perform(get("/api/clientas/inactivas").header("Authorization", VENDEDORA))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.mensaje").value("No se pudieron calcular las estadísticas. Intenta de nuevo."));
        mvc.perform(get("/api/clientas").header("Authorization", VENDEDORA)).andExpect(status().isOk());
    }

    @Test
    void laListaTraeLaUltimaCompra() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Con compra\"}"));
        when(lives.comprasPorClienta(null, null)).thenReturn(List.of(new ResumenCompras(id, 5000, 1, Instant.parse("2026-10-15T23:00:00Z"))));

        mvc.perform(get("/api/clientas").header("Authorization", VENDEDORA))
                .andExpect(jsonPath("$[?(@.id == '" + id + "')].ultimaCompra").value("2026-10-15T23:00:00Z"));
    }

    @Test
    void unaClientaRecienCreadaConLineasNoSeBorra() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Con línea\"}"));
        when(lives.tieneLineas(id)).thenReturn(true);

        mvc.perform(delete("/api/clientas/" + id).header("Authorization", VENDEDORA)).andExpect(status().isConflict());
        mvc.perform(get("/api/clientas/" + id).header("Authorization", VENDEDORA)).andExpect(status().isOk());
    }

    // RF-13: indicadores de la ficha, con ms-lives simulado

    @Test
    void laFichaEntregaSusIndicadoresDesdeElHistorial() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Con historial\"}"));
        when(lives.historial(id)).thenReturn(List.of(new CompraClienta(
                new CompraClienta.SesionCompra(Instant.parse("2026-10-15T23:00:00Z"), "CERRADA"),
                new CompraClienta.LineaCompra("PAGADO", List.of(new CompraClienta.PrendaCompra(6000, "VIGENTE"), new CompraClienta.PrendaCompra(4000, "CANCELADA"))))));

        mvc.perform(get("/api/clientas/" + id + "/indicadores").header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalGastado").value(6000))
                .andExpect(jsonPath("$.compras").value(1))
                .andExpect(jsonPath("$.ticketPromedio").value(6000))
                .andExpect(jsonPath("$.ultimaCompra").value("2026-10-15T23:00:00Z"))
                .andExpect(jsonPath("$.prendasCanceladas").value(1))
                .andExpect(jsonPath("$.livesSinPago").value(0));
    }

    @Test
    void losIndicadoresSinComprasNoTraenUltimaCompra() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Sin compras\"}"));

        mvc.perform(get("/api/clientas/" + id + "/indicadores").header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalGastado").value(0))
                .andExpect(jsonPath("$.ultimaCompra").doesNotExist());
    }

    @Test
    void losIndicadoresDeUnaClientaInexistenteResponden404() throws Exception {
        mvc.perform(get("/api/clientas/no-existe/indicadores").header("Authorization", VENDEDORA)).andExpect(status().isNotFound());
    }

    @Test
    void siMsLivesNoRespondeLosIndicadoresDanUnErrorClaro() throws Exception {
        String id = idDe(crear(VENDEDORA, "{\"nombre\":\"Sin ms-lives\"}"));
        when(lives.historial(id)).thenThrow(new IllegalStateException("sin conexión"));

        mvc.perform(get("/api/clientas/" + id + "/indicadores").header("Authorization", VENDEDORA))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.mensaje").value("No se pudieron calcular las estadísticas. Intenta de nuevo."));
    }
}
