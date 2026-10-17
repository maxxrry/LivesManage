package cl.livesmanage.clientas.cliente;

import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
            var autenticacion = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
            http.post().uri("/api/lives/clientas/{id}/sincronizar-nombre", clientaId)
                    .header("Authorization", "Bearer " + autenticacion.getToken().getTokenValue())
                    .retrieve().toBodilessEntity();
        } catch (RuntimeException e) { // también sin sesión JWT: la ficha ya se guardó, no debe fallar la respuesta
            log.warn("No se pudo actualizar el nombre de la clienta {} en ms-lives: {}", clientaId, e.getMessage());
        }
    }
}
