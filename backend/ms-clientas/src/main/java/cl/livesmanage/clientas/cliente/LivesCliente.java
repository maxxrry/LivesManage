package cl.livesmanage.clientas.cliente;

import cl.livesmanage.clientas.dto.CompraClienta;
import cl.livesmanage.clientas.dto.ResumenCompras;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Llamadas REST a ms-lives. Reenvía el JWT de la usuaria, como ms-lives hace con ms-clientas. */
@Slf4j
@Component
public class LivesCliente {

    private final RestClient http;

    public LivesCliente(@Value("${livesmanage.lives-url}") String url) {
        var tiempos = new SimpleClientHttpRequestFactory();
        tiempos.setConnectTimeout(Duration.ofSeconds(2));
        tiempos.setReadTimeout(Duration.ofSeconds(5)); // que un servicio colgado no deje la pantalla esperando
        this.http = RestClient.builder().baseUrl(url).requestFactory(tiempos).build();
    }

    /**
     * D-28: ms-lives iguala la copia del nombre en las líneas a la ficha. Si no responde, la ficha igual queda guardada
     * y se deja aviso en el log; volver a guardar la ficha lo repara.
     */
    public void sincronizarNombre(String clientaId) {
        try {
            http.post().uri("/api/lives/clientas/{id}/sincronizar-nombre", clientaId)
                    .header("Authorization", bearer())
                    .retrieve().toBodilessEntity();
        } catch (RuntimeException e) { // también sin sesión JWT: la ficha ya se guardó, no debe fallar la respuesta
            log.warn("No se pudo actualizar el nombre de la clienta {} en ms-lives: {}", clientaId, e.getMessage());
        }
    }

    /** RF-14 (D-42): compras por clienta en un período de días de Chile; sin fechas, todas. Si ms-lives falla, lanza la excepción. */
    public List<ResumenCompras> comprasPorClienta(LocalDate desde, LocalDate hasta) {
        return Objects.requireNonNull(http.get()
                .uri(uri -> {
                    uri.path("/api/lives/compras-por-clienta");
                    if (desde != null) uri.queryParam("desde", desde);
                    if (hasta != null) uri.queryParam("hasta", hasta);
                    return uri.build();
                })
                .header("Authorization", bearer())
                .retrieve().body(new ParameterizedTypeReference<>() {}));
    }

    /** RF-13: las líneas de una clienta con su live. Si ms-lives falla, lanza la excepción. */
    public List<CompraClienta> historial(String clientaId) {
        return Objects.requireNonNull(http.get().uri(uri -> uri.path("/api/lives/lineas").queryParam("clientaId", clientaId).build())
                .header("Authorization", bearer())
                .retrieve().body(new ParameterizedTypeReference<>() {}));
    }

    /** D-37: una clienta con líneas no se borra. Si ms-lives falla, lanza la excepción. */
    public boolean tieneLineas(String clientaId) {
        return !historial(clientaId).isEmpty();
    }

    private static String bearer() {
        var autenticacion = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        return "Bearer " + autenticacion.getToken().getTokenValue();
    }
}
