package cl.livesmanage.lives.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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

import cl.livesmanage.lives.cliente.ClientasCliente;
import cl.livesmanage.lives.cliente.ClientasCliente.ClientaRef;
import cl.livesmanage.lives.model.EstadoSesion;
import cl.livesmanage.lives.repository.AnotacionRepository;
import cl.livesmanage.lives.repository.EntregaRepository;
import cl.livesmanage.lives.repository.LineaRepository;
import cl.livesmanage.lives.repository.SesionRepository;
import cl.livesmanage.lives.model.Sesion;
import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * RF-04 a RF-08 de punta a punta con H2. ms-clientas se simula. Cada prueba parte con la base vacía (solo puede haber
 * un live Abierto). Sin @Transactional en la clase: las compensaciones con ms-clientas dependen de que la transacción
 * real se confirme o se revierta.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LiveControllerTest {

    private static final String SECRETO = "clave-solo-para-pruebas-de-al-menos-32-caracteres";
    private static final String VENDEDORA = "Bearer " + token("u-2", "VENDEDOR");
    private static final String ADMIN = "Bearer " + token("u-1", "ADMIN");

    @Autowired
    private MockMvc mvc;

    @Autowired
    private SesionRepository sesiones;

    @Autowired
    private LineaRepository lineas;

    @Autowired
    private AnotacionRepository anotaciones;

    @Autowired
    private EntregaRepository entregas;

    @MockitoBean
    private ClientasCliente clientas;

    private static String token(String id, String rol) {
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(SECRETO.getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("ms-auth").subject(id).claim("rol", rol).issuedAt(ahora).expiresAt(ahora.plusSeconds(3600)).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    @BeforeEach
    void baseVaciaYClientasSimuladas() {
        anotaciones.deleteAll();
        lineas.deleteAll();
        entregas.deleteAll();
        sesiones.deleteAll();
        when(clientas.obtener("c-baja")).thenReturn(new ClientaRef("c-baja", "Dada de baja", false));
        when(clientas.obtener("c-flo")).thenReturn(new ClientaRef("c-flo", "Florencia Ruiz", true));
        when(clientas.obtener("c-gabi")).thenReturn(new ClientaRef("c-gabi", "Gabriela Peña", true));
        when(clientas.crear(anyString())).thenAnswer(i -> new ClientaRef("c-nueva", i.getArgument(0), true));
    }

    private void cambiarEstado(String live, EstadoSesion estado) {
        Sesion sesion = sesiones.findById(live).orElseThrow();
        sesion.setEstado(estado);
        sesiones.save(sesion);
    }

    private String abrirLive() throws Exception {
        return JsonPath.read(mvc.perform(post("/api/lives").header("Authorization", VENDEDORA)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Live jueves\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private ResultActions anotar(String live, String destino, int... precios) throws Exception {
        String lista = String.join(",", java.util.Arrays.stream(precios).mapToObj(String::valueOf).toList());
        return mvc.perform(post("/api/lives/" + live + "/anotaciones").header("Authorization", VENDEDORA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destino\":" + destino + ",\"precios\":[" + lista + "]}"));
    }

    private static String cuerpo(ResultActions r) throws Exception {
        return r.andReturn().getResponse().getContentAsString();
    }

    private ResultActions detalle(String live) throws Exception {
        return mvc.perform(get("/api/lives/" + live).header("Authorization", VENDEDORA));
    }

    // RF-04

    @Test
    void conUnLiveAbiertoNoSePuedeAbrirOtroYLaListaMuestraSusTotales() throws Exception {
        String live = abrirLive();
        mvc.perform(post("/api/lives").header("Authorization", VENDEDORA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ya hay un live abierto. Continúa en él o termínalo antes de abrir otro."));

        anotar(live, "{\"clientaId\":\"c-flo\"}", 6000, 4000);
        String lista = cuerpo(mvc.perform(get("/api/lives").header("Authorization", VENDEDORA)).andExpect(status().isOk()));
        List<Integer> totales = JsonPath.read(lista, "$[?(@.id == '" + live + "')].total");
        List<String> estados = JsonPath.read(lista, "$[?(@.id == '" + live + "')].estado");
        org.assertj.core.api.Assertions.assertThat(totales).containsExactly(10000);
        org.assertj.core.api.Assertions.assertThat(estados).containsExactly("ABIERTA");
    }

    @Test
    void sinTokenResponde401() throws Exception {
        mvc.perform(get("/api/lives")).andExpect(status().isUnauthorized());
    }

    // RF-05

    @Test
    void anotarSumaALaLineaExistenteYCreaClientaYLineaSiEsNueva() throws Exception {
        String live = abrirLive();
        anotar(live, "{\"clientaId\":\"c-flo\"}", 5000).andExpect(status().isCreated());

        // "flo 6-4" suma $10.000 a la línea existente de Florencia (criterio de RF-05).
        anotar(live, "{\"clientaId\":\"c-flo\"}", 6000, 4000)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.anotacionId").isString())
                .andExpect(jsonPath("$.linea.clientaNombre").value("Florencia Ruiz"))
                .andExpect(jsonPath("$.linea.prendas.length()").value(3));

        // "ana 5" crea clienta y línea.
        anotar(live, "{\"nuevaClienta\":\"  Ana  \"}", 5000)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.linea.clientaId").value("c-nueva"))
                .andExpect(jsonPath("$.linea.clientaNombre").value("Ana"));
        verify(clientas).crear("Ana");

        detalle(live).andExpect(jsonPath("$.lineas.length()").value(2));
    }

    @Test
    void preciosInvalidosSeRechazanSinGuardarNada() throws Exception {
        String live = abrirLive();
        anotar(live, "{\"clientaId\":\"c-flo\"}", 6500).andExpect(status().isBadRequest()).andExpect(jsonPath("$.mensaje").value("Precios no válidos."));
        anotar(live, "{\"clientaId\":\"c-flo\"}", 0).andExpect(status().isBadRequest());
        anotar(live, "{\"clientaId\":\"c-flo\"}").andExpect(status().isBadRequest());
        anotar(live, "{\"clientaId\":\"c-flo\",\"nuevaClienta\":\"flo\"}", 6000).andExpect(status().isBadRequest());

        detalle(live).andExpect(jsonPath("$.lineas.length()").value(0));
    }

    @Test
    void enUnLiveQueNoEstaAbiertoNoSeAnota() throws Exception {
        String live = abrirLive();
        cambiarEstado(live, EstadoSesion.EN_CIERRE); // terminar llega con RF-09

        anotar(live, "{\"clientaId\":\"c-flo\"}", 6000)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("El live no está abierto; no se puede anotar."));
    }

    // D-11, D-20 y D-22

    @Test
    void deshacerBorraLaLineaYLaClientaQueLaAnotacionCreo() throws Exception {
        String live = abrirLive();
        String anotacion = JsonPath.read(cuerpo(anotar(live, "{\"nuevaClienta\":\"flo 6\"}", 4000)), "$.anotacionId");

        mvc.perform(delete("/api/lives/" + live + "/anotaciones/" + anotacion).header("Authorization", VENDEDORA))
                .andExpect(status().isNoContent());
        detalle(live).andExpect(jsonPath("$.lineas.length()").value(0));
        verify(clientas).borrarRecienCreada("c-nueva");

        mvc.perform(delete("/api/lives/" + live + "/anotaciones/" + anotacion).header("Authorization", VENDEDORA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("La anotación ya no se puede deshacer."));
    }

    @Test
    void anotarEnUnaLineaPagadaLaVuelvePendienteYDeshacerLaDejaPagada() throws Exception {
        String live = abrirLive();
        String linea = JsonPath.read(cuerpo(anotar(live, "{\"clientaId\":\"c-flo\"}", 6000)), "$.linea.id");
        mvc.perform(patch("/api/lives/" + live + "/lineas/" + linea + "/pago").header("Authorization", VENDEDORA))
                .andExpect(jsonPath("$.estadoPago").value("PAGADO"))
                .andExpect(jsonPath("$.pagoActualizado.usuarioId").value("u-2"));

        String anotacion = JsonPath.read(cuerpo(anotar(live, "{\"clientaId\":\"c-flo\"}", 4000)
                .andExpect(jsonPath("$.linea.estadoPago").value("PENDIENTE"))), "$.anotacionId");

        mvc.perform(delete("/api/lives/" + live + "/anotaciones/" + anotacion).header("Authorization", VENDEDORA))
                .andExpect(status().isNoContent());
        detalle(live)
                .andExpect(jsonPath("$.lineas[0].estadoPago").value("PAGADO"))
                .andExpect(jsonPath("$.lineas[0].prendas.length()").value(1));
        verify(clientas, never()).borrarRecienCreada(anyString());
    }

    @Test
    void siLaLineaCambioDespuesDeAnotarYaNoSeDeshace() throws Exception {
        String live = abrirLive();
        String resultado = cuerpo(anotar(live, "{\"clientaId\":\"c-flo\"}", 6000));
        String linea = JsonPath.read(resultado, "$.linea.id");
        String anotacion = JsonPath.read(resultado, "$.anotacionId");

        mvc.perform(patch("/api/lives/" + live + "/lineas/" + linea + "/pago").header("Authorization", VENDEDORA));

        mvc.perform(delete("/api/lives/" + live + "/anotaciones/" + anotacion).header("Authorization", VENDEDORA))
                .andExpect(status().isConflict());
    }

    @Test
    void unaAnotacionNuevaEnLaMismaLineaAnulaElDeshacerDeLaAnterior() throws Exception {
        String live = abrirLive();
        String primera = JsonPath.read(cuerpo(anotar(live, "{\"nuevaClienta\":\"flo\"}", 6000)), "$.anotacionId");
        anotar(live, "{\"clientaId\":\"c-nueva\"}", 4000);

        // Deshacer la primera borraría la línea con la prenda de la segunda (D-22).
        mvc.perform(delete("/api/lives/" + live + "/anotaciones/" + primera).header("Authorization", VENDEDORA))
                .andExpect(status().isConflict());
        detalle(live).andExpect(jsonPath("$.lineas[0].prendas.length()").value(2));
    }

    @Test
    void siLaBaseFallaDespuesDeCrearLaClientaEstaSeBorra() throws Exception {
        String live = abrirLive();
        // ms-clientas devuelve un nombre que no cabe en la columna: la clienta ya se creó cuando falla la base.
        when(clientas.crear("ana")).thenReturn(new ClientaRef("c-larga", "x".repeat(150), true));

        anotar(live, "{\"nuevaClienta\":\"ana\"}", 5000).andExpect(status().isConflict());

        verify(clientas).borrarRecienCreada("c-larga");
        detalle(live).andExpect(jsonPath("$.lineas.length()").value(0));
    }

    @Test
    void conElLiveNoAbiertoNoSeCreaLaClienta() throws Exception {
        String live = abrirLive();
        cambiarEstado(live, EstadoSesion.EN_CIERRE);

        anotar(live, "{\"nuevaClienta\":\"ana\"}", 5000).andExpect(status().isConflict());
        verify(clientas, never()).crear(anyString()); // valida el live antes de tocar ms-clientas
    }

    @Test
    void aUnaClientaDesactivadaNoSeLeCreaLinea() throws Exception {
        String live = abrirLive();
        anotar(live, "{\"clientaId\":\"c-baja\"}", 5000)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("La clienta está desactivada."));
    }

    // RF-06 y RF-07

    @Test
    void quitarUnaPrendaBajaElTotalYRestaurarlaLoRepone() throws Exception {
        String live = abrirLive();
        String resultado = cuerpo(anotar(live, "{\"clientaId\":\"c-flo\"}", 6000, 4000));
        String linea = JsonPath.read(resultado, "$.linea.id");
        String prenda = JsonPath.read(resultado, "$.linea.prendas[0].id");
        String ruta = "/api/lives/" + live + "/lineas/" + linea + "/prendas/" + prenda;

        mvc.perform(patch(ruta).header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prendas[0].estado").value("CANCELADA"));
        mvc.perform(get("/api/lives").header("Authorization", VENDEDORA)).andExpect(jsonPath("$[0].total").value(4000));

        mvc.perform(patch(ruta).header("Authorization", VENDEDORA)).andExpect(jsonPath("$.prendas[0].estado").value("VIGENTE"));
        mvc.perform(get("/api/lives").header("Authorization", VENDEDORA)).andExpect(jsonPath("$[0].total").value(10000));
    }

    @Test
    void unLiveCerradoEsSoloLectura() throws Exception {
        String live = abrirLive();
        String linea = JsonPath.read(cuerpo(anotar(live, "{\"clientaId\":\"c-flo\"}", 6000)), "$.linea.id");
        cambiarEstado(live, EstadoSesion.CERRADA);

        mvc.perform(patch("/api/lives/" + live + "/lineas/" + linea + "/pago").header("Authorization", VENDEDORA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("El live está cerrado: es solo lectura."));
    }

    @Test
    void cambiarLaClientaAUnaQueYaTieneLineaLasUne() throws Exception {
        String live = abrirLive();
        String lineaFlo = JsonPath.read(cuerpo(anotar(live, "{\"clientaId\":\"c-flo\"}", 6000)), "$.linea.id");
        String lineaGabi = JsonPath.read(cuerpo(anotar(live, "{\"clientaId\":\"c-gabi\"}", 5000, 3000)), "$.linea.id");
        mvc.perform(patch("/api/lives/" + live + "/lineas/" + lineaGabi + "/pago").header("Authorization", VENDEDORA));

        // Las prendas de Florencia pasan a la línea de Gabriela, que vuelve a Pendiente (D-19).
        mvc.perform(patch("/api/lives/" + live + "/lineas/" + lineaFlo + "/clienta").header("Authorization", VENDEDORA)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"clientaId\":\"c-gabi\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(lineaGabi))
                .andExpect(jsonPath("$.prendas.length()").value(3))
                .andExpect(jsonPath("$.estadoPago").value("PENDIENTE"));
        detalle(live).andExpect(jsonPath("$.lineas.length()").value(1));
    }

    @Test
    void cambiarAUnaClientaSinLineaSoloCambiaElNombre() throws Exception {
        String live = abrirLive();
        String linea = JsonPath.read(cuerpo(anotar(live, "{\"clientaId\":\"c-flo\"}", 6000)), "$.linea.id");

        mvc.perform(patch("/api/lives/" + live + "/lineas/" + linea + "/clienta").header("Authorization", VENDEDORA)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"clientaId\":\"c-gabi\"}"))
                .andExpect(jsonPath("$.id").value(linea))
                .andExpect(jsonPath("$.clientaNombre").value("Gabriela Peña"));
    }

    // Cierre (RF-09 a RF-11)

    private ResultActions accion(MockHttpServletRequestBuilder peticion, String json) throws Exception {
        peticion.header("Authorization", VENDEDORA);
        return mvc.perform(json == null ? peticion : peticion.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String lineaId(String live, String clienta, int precio) throws Exception {
        return JsonPath.read(cuerpo(anotar(live, "{\"clientaId\":\"" + clienta + "\"}", precio)), "$.linea.id");
    }

    @Test
    void terminarPasaAEnCierreYYaNoSeAnotaPeroSePuedeAbrirOtro() throws Exception {
        String live = abrirLive();
        accion(post("/api/lives/" + live + "/terminar"), null).andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("EN_CIERRE"));

        anotar(live, "{\"clientaId\":\"c-flo\"}", 6000).andExpect(status().isConflict());
        accion(post("/api/lives/" + live + "/terminar"), null).andExpect(status().isConflict());
        abrirLive(); // uno En cierre no bloquea
    }

    @Test
    void laBolsaSoloSeRevisaEnCierre() throws Exception {
        String live = abrirLive();
        String linea = lineaId(live, "c-flo", 6000);
        accion(patch("/api/lives/" + live + "/lineas/" + linea + "/bolsa"), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Las bolsas se revisan en el cierre del live."));

        accion(post("/api/lives/" + live + "/terminar"), null);
        accion(patch("/api/lives/" + live + "/lineas/" + linea + "/bolsa"), null).andExpect(jsonPath("$.bolsaRevisada").value(true));
    }

    @Test
    void despachoExigeDireccionYLaGuardaEnLaFicha() throws Exception {
        String live = abrirLive();
        String linea = lineaId(live, "c-flo", 6000);
        accion(post("/api/lives/" + live + "/terminar"), null);
        String ruta = "/api/lives/" + live + "/lineas/" + linea + "/entrega";

        accion(put(ruta), "{\"tipo\":\"DESPACHO\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El despacho necesita una dirección."));
        accion(put(ruta), "{\"tipo\":\"DESPACHO\",\"direccion\":{\"calle\":\"Los Aromos 1234\",\"comuna\":\"\"}}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.mensaje").value("Falta la comuna de la dirección."));

        accion(put(ruta), "{\"tipo\":\"DESPACHO\",\"direccion\":{\"calle\":\" Los Aromos 1234 \",\"comuna\":\"Maipú\"}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.direccion.calle").value("Los Aromos 1234"))
                .andExpect(jsonPath("$.direccion.region").value("Metropolitana"));
        verify(clientas).guardarDireccion(eq("c-flo"), any());
    }

    @Test
    void hermanasCompartenDespachoYCambiarUnaLaSacaDelGrupo() throws Exception {
        String live = abrirLive();
        String flo = lineaId(live, "c-flo", 6000);
        String gabi = lineaId(live, "c-gabi", 5000);
        accion(post("/api/lives/" + live + "/terminar"), null);
        String despacho = JsonPath.read(cuerpo(accion(put("/api/lives/" + live + "/lineas/" + flo + "/entrega"),
                "{\"tipo\":\"DESPACHO\",\"direccion\":{\"calle\":\"Los Aromos 1234\",\"comuna\":\"Maipú\"}}")), "$.id");
        String propia = JsonPath.read(cuerpo(accion(put("/api/lives/" + live + "/lineas/" + gabi + "/entrega"), "{\"tipo\":\"RETIRO\"}")), "$.id");

        accion(patch("/api/lives/" + live + "/lineas/" + gabi + "/entrega"), "{\"entregaId\":\"" + despacho + "\"}")
                .andExpect(jsonPath("$.id").value(despacho));
        assertThat(entregas.existsById(propia)).isFalse(); // su retiro quedó sin líneas (D-05)

        // Gabriela pasa a Feria: sale del grupo y Florencia conserva su despacho (D-26).
        accion(put("/api/lives/" + live + "/lineas/" + gabi + "/entrega"), "{\"tipo\":\"FERIA\"}")
                .andExpect(jsonPath("$.id").value(not(despacho)));
        assertThat(lineas.findById(flo).orElseThrow().getEntregaId()).isEqualTo(despacho);
    }

    @Test
    void finalizarExigeBolsasCobrosYEntregasYDespuesEsSoloLectura() throws Exception {
        String live = abrirLive();
        String flo = lineaId(live, "c-flo", 6000);
        String gabi = lineaId(live, "c-gabi", 5000);
        accion(post("/api/lives/" + live + "/terminar"), null);
        String finalizar = "/api/lives/" + live + "/finalizar";

        accion(post(finalizar), null).andExpect(status().isConflict()).andExpect(jsonPath("$.mensaje").value("Falta revisar 2 bolsa(s)."));
        for (String l : new String[] {flo, gabi}) accion(patch("/api/lives/" + live + "/lineas/" + l + "/bolsa"), null);
        accion(post(finalizar), null).andExpect(jsonPath("$.mensaje").value("Hay 2 línea(s) Pendiente(s): cóbralas o márcalas No pagó."));

        accion(patch("/api/lives/" + live + "/lineas/" + flo + "/pago"), null);
        accion(put("/api/lives/" + live + "/lineas/" + gabi + "/no-pago"), "{\"noPago\":true}").andExpect(jsonPath("$.estadoPago").value("NO_PAGO"));
        accion(put("/api/lives/" + live + "/lineas/" + flo + "/no-pago"), "{\"noPago\":true}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.mensaje").value("La línea está Pagada."));
        accion(post(finalizar), null).andExpect(jsonPath("$.mensaje").value("Falta la forma de entrega de 1 clienta(s) que pagaron."));

        accion(put("/api/lives/" + live + "/lineas/" + flo + "/entrega"), "{\"tipo\":\"RETIRO\"}");
        accion(post(finalizar), null).andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CERRADA"));
        accion(patch("/api/lives/" + live + "/lineas/" + flo + "/pago"), null).andExpect(status().isConflict());
    }

    @Test
    void soloLaAdminReabreUnLiveCerrado() throws Exception {
        String live = abrirLive();
        cambiarEstado(live, EstadoSesion.CERRADA);

        accion(post("/api/lives/" + live + "/reabrir"), null).andExpect(status().isForbidden());
        mvc.perform(post("/api/lives/" + live + "/reabrir").header("Authorization", ADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("EN_CIERRE"));
    }

    // Historial (RF-13) y renombrar (D-28)

    @Test
    void elHistorialTraeLasLineasDeLaClientaConSuLiveYSuEntrega() throws Exception {
        String live = abrirLive();
        String flo = lineaId(live, "c-flo", 6000);
        lineaId(live, "c-gabi", 5000);
        accion(post("/api/lives/" + live + "/terminar"), null);
        accion(put("/api/lives/" + live + "/lineas/" + flo + "/entrega"), "{\"tipo\":\"RETIRO\"}");

        mvc.perform(get("/api/lives/lineas").param("clientaId", "c-flo").header("Authorization", VENDEDORA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].sesion.id").value(live))
                .andExpect(jsonPath("$[0].linea.id").value(flo))
                .andExpect(jsonPath("$[0].entrega.tipo").value("RETIRO"));
        mvc.perform(get("/api/lives/lineas").header("Authorization", VENDEDORA)).andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void sincronizarIgualaElNombreDeLasLineasAlDeLaFicha() throws Exception {
        String live = abrirLive();
        lineaId(live, "c-flo", 6000);
        when(clientas.obtener("c-flo")).thenReturn(new ClientaRef("c-flo", "Florencia Ruiz Soto", true)); // ficha renombrada

        accion(post("/api/lives/clientas/c-flo/sincronizar-nombre"), null).andExpect(status().isNoContent());
        detalle(live).andExpect(jsonPath("$.lineas[0].clientaNombre").value("Florencia Ruiz Soto"));
        assertThat(lineas.findAll().get(0).getVersion()).isPositive(); // el cambio cuenta para el bloqueo optimista
    }

    @Test
    void unLiveQueNoExisteResponde404() throws Exception {
        detalle("no-existe").andExpect(status().isNotFound()).andExpect(jsonPath("$.mensaje").value("El live no existe."));
    }

    @Test
    void swaggerEstaDisponibleSinToken() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andExpect(jsonPath("$.paths['/api/lives']").exists());
    }
}
