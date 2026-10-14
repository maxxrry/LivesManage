package cl.livesmanage.gateway.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Contra la fuerza bruta: tras 10 inicios de sesión fallidos desde una misma IP en 15 minutos, responde 429 hasta que pase la ventana.
 * Solo cuentan los fallidos, para que varias vendedoras detrás del mismo Wi-Fi no se bloqueen entre ellas.
 * shortcut: contador en memoria y IP de la conexión; con más de una instancia o detrás de un proxy, pasar a un almacén compartido y X-Forwarded-For.
 */
@Slf4j
@Component
public class LimiteLogin extends OncePerRequestFilter {

    static final int MAX_FALLOS = 10;
    static final Duration VENTANA = Duration.ofMinutes(15);

    private record Fallos(Instant desde, int cantidad) {
        boolean vigente(Instant ahora) {
            return desde.plus(VENTANA).isAfter(ahora);
        }
    }

    /** El mismo tipo de comparación que usa Spring Security, sobre la ruta decodificada: /api/auth/logi%6E también cuenta. */
    private static final RequestMatcher LOGIN = PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/login");

    private final Map<String, Fallos> fallosPorIp = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest peticion) {
        return !LOGIN.matches(peticion);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        String ip = peticion.getRemoteAddr();
        Instant ahora = Instant.now();
        // Cada intento se cuenta antes de reenviarlo (de forma atómica) y se descuenta si no falló:
        // así muchos intentos en paralelo no pasan todos antes de que se registre el primero.
        Fallos fallos = fallosPorIp.compute(ip,
                (clave, antes) -> antes == null || !antes.vigente(ahora) ? new Fallos(ahora, 1) : new Fallos(antes.desde(), antes.cantidad() + 1));
        if (fallos.cantidad() > MAX_FALLOS) {
            log.warn("Login bloqueado por demasiados intentos fallidos desde una IP");
            RespuestaJson.escribir(respuesta, 429, "Demasiados intentos. Espera unos minutos y vuelve a intentar.");
            return;
        }

        cadena.doFilter(peticion, respuesta);

        if (respuesta.getStatus() != 401) {
            fallosPorIp.computeIfPresent(ip, (clave, antes) -> new Fallos(antes.desde(), Math.max(0, antes.cantidad() - 1)));
        }
        if (fallosPorIp.size() > 10_000) {
            fallosPorIp.values().removeIf(f -> !f.vigente(ahora)); // que el mapa no crezca sin límite
        }
    }
}
