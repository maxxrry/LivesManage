package cl.livesmanage.lives.cliente;

import cl.livesmanage.lives.exception.ReglaException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Llamadas REST a ms-clientas (sin joins entre bases). Reenvía el JWT de la usuaria: ms-clientas valida y registra
 * igual que si la llamada viniera del frontend.
 */
@Slf4j
@Component
public class ClientasCliente {

    /** Lo que ms-lives necesita de una clienta; el resto de la ficha se ignora. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ClientaRef(String id, String nombre, boolean activa) {}

    private final RestClient http;

    public ClientasCliente(@Value("${livesmanage.clientas-url}") String url) {
        this.http = RestClient.builder().baseUrl(url).build();
    }

    public ClientaRef obtener(String id) {
        try {
            return http.get().uri("/api/clientas/{id}", id).header("Authorization", bearer()).retrieve().body(ClientaRef.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ReglaException(HttpStatus.NOT_FOUND, null, "La clienta no existe.");
        } catch (HttpClientErrorException e) {
            throw comoRegla(e);
        } catch (RestClientException e) {
            throw sinConexion(e);
        }
    }

    public ClientaRef crear(String nombre) {
        try {
            return http.post().uri("/api/clientas").header("Authorization", bearer())
                    .body(Map.of("nombre", nombre)).retrieve().body(ClientaRef.class);
        } catch (HttpClientErrorException e) {
            throw comoRegla(e);
        } catch (RestClientException e) {
            throw sinConexion(e);
        }
    }

    /** Deshacer (D-11): si falla, la anotación igual se deshace; la clienta queda y se puede desactivar. */
    public void borrarRecienCreada(String id) {
        try {
            http.delete().uri("/api/clientas/{id}", id).header("Authorization", bearer()).retrieve().toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("No se pudo borrar la clienta {} al deshacer: {}", id, e.getMessage());
        }
    }

    private static String bearer() {
        var autenticacion = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        return "Bearer " + autenticacion.getToken().getTokenValue();
    }

    /** Un 4xx de ms-clientas (dato inválido, sesión vencida, sin permiso) llega al frontend con su código y su mensaje. */
    private static ReglaException comoRegla(HttpClientErrorException e) {
        Map<?, ?> cuerpo = e.getResponseBodyAs(Map.class);
        Object mensaje = cuerpo == null ? null : cuerpo.get("mensaje");
        return new ReglaException(HttpStatus.valueOf(e.getStatusCode().value()), null,
                mensaje instanceof String texto ? texto : "No se pudo guardar la clienta.");
    }

    private static ReglaException sinConexion(RestClientException e) {
        log.error("Falló la llamada a ms-clientas", e);
        return new ReglaException(HttpStatus.SERVICE_UNAVAILABLE, null, "No se pudo consultar las clientas. Intenta de nuevo.");
    }
}
