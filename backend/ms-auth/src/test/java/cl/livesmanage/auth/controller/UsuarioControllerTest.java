package cl.livesmanage.auth.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** RF-03 y el 403 de RF-02, de punta a punta con H2 y la Admin inicial de application-test.yml. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UsuarioControllerTest {

    @Autowired
    private MockMvc mvc;

    private String token(String correo, String contrasena) throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"" + correo + "\",\"contrasena\":\"" + contrasena + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(cuerpo, "$.token");
    }

    private String tokenAdmin() throws Exception {
        return token("admin@livesmanage.cl", "admin1234");
    }

    /** Correo distinto en cada prueba: comparten la misma base H2. */
    private static String correoNuevo() {
        return "u" + UUID.randomUUID().toString().substring(0, 8) + "@livesmanage.cl";
    }

    private ResultActions crear(String token, String correo, String rol) throws Exception {
        return mvc.perform(post("/api/usuarios")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Nueva\",\"correo\":\"" + correo + "\",\"rol\":\"" + rol + "\",\"contrasena\":\"inicial123\"}"));
    }

    private String idDe(ResultActions resultado) throws Exception {
        return JsonPath.read(resultado.andReturn().getResponse().getContentAsString(), "$.id");
    }

    @Test
    void laAdminCreaUnaVendedoraQueLuegoIniciaSesion() throws Exception {
        String correo = correoNuevo();
        crear(tokenAdmin(), correo, "VENDEDOR")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.correo").value(correo))
                .andExpect(jsonPath("$.rol").value("VENDEDOR"))
                .andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.contrasena").doesNotExist());

        token(correo, "inicial123"); // criterio de aceptación de RF-03
    }

    @Test
    void unCorreoRepetidoSeRechaza() throws Exception {
        String correo = correoNuevo();
        crear(tokenAdmin(), correo, "VENDEDOR").andExpect(status().isCreated());

        crear(tokenAdmin(), correo.toUpperCase(), "VENDEDOR")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.campos.correo").value("Ya existe un usuario con ese correo."));
    }

    @Test
    void datosInvalidosRespondenErrorPorCampo() throws Exception {
        mvc.perform(post("/api/usuarios")
                        .header("Authorization", "Bearer " + tokenAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"\",\"correo\":\"x\",\"contrasena\":\"corta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nombre").value("Ingresa el nombre."))
                .andExpect(jsonPath("$.campos.correo").value("Ingresa un correo válido."))
                .andExpect(jsonPath("$.campos.rol").value("Elige un rol."))
                .andExpect(jsonPath("$.campos.contrasena").value("La contraseña debe tener al menos 8 caracteres."));
    }

    @Test
    void unaVendedoraRecibe403() throws Exception {
        String correo = correoNuevo();
        crear(tokenAdmin(), correo, "VENDEDOR");
        String tokenVendedora = token(correo, "inicial123");

        mvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + tokenVendedora))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("No tienes permiso para hacer esto."));
        crear(tokenVendedora, correoNuevo(), "ADMIN").andExpect(status().isForbidden());
    }

    @Test
    void unUsuarioDesactivadoNoEntraYSePuedeReactivar() throws Exception {
        String correo = correoNuevo();
        String id = idDe(crear(tokenAdmin(), correo, "VENDEDOR"));

        mvc.perform(patch("/api/usuarios/" + id + "/activo")
                        .header("Authorization", "Bearer " + tokenAdmin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"" + correo + "\",\"contrasena\":\"inicial123\"}"))
                .andExpect(status().isUnauthorized());

        mvc.perform(patch("/api/usuarios/" + id + "/activo")
                        .header("Authorization", "Bearer " + tokenAdmin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":true}"))
                .andExpect(status().isOk());
        token(correo, "inicial123");
    }

    @Test
    void laAdminNoSeDesactivaNiSeCambiaElRol() throws Exception {
        String token = tokenAdmin();
        String idAdmin = JsonPath.read(
                mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + token)).andReturn().getResponse().getContentAsString(),
                "$.id");

        mvc.perform(patch("/api/usuarios/" + idAdmin + "/activo")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("No puedes desactivar tu propia cuenta."));
        mvc.perform(put("/api/usuarios/" + idAdmin)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Admin\",\"correo\":\"admin@livesmanage.cl\",\"rol\":\"VENDEDOR\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.campos.rol").value("No puedes cambiar tu propio rol."));
    }

    @Test
    void unaAdminDegradadaPierdeElAccesoAunqueSuTokenDigaAdmin() throws Exception {
        String correo = correoNuevo();
        String id = idDe(crear(tokenAdmin(), correo, "ADMIN"));
        String tokenViejo = token(correo, "inicial123"); // rol ADMIN en el JWT

        mvc.perform(put("/api/usuarios/" + id)
                        .header("Authorization", "Bearer " + tokenAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Nueva\",\"correo\":\"" + correo + "\",\"rol\":\"VENDEDOR\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + tokenViejo))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("No tienes permiso para hacer esto."));
    }

    @Test
    void editarUnUsuarioQueNoExisteResponde404() throws Exception {
        mvc.perform(put("/api/usuarios/no-existe")
                        .header("Authorization", "Bearer " + tokenAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"X\",\"correo\":\"x@livesmanage.cl\",\"rol\":\"VENDEDOR\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("El usuario no existe."));
    }
}
