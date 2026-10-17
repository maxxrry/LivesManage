package cl.livesmanage.lives.config;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Valida el JWT de ms-auth con la clave compartida (D-33) y revisa el rol (RNF-07).
 * Ambos roles anotan, corrigen y marcan pagos (RF-04 a RF-08).
 */
@Configuration
public class SeguridadConfig {

    private static final String MENSAJE_401 = "Tu sesión expiró o no es válida. Vuelve a iniciar sesión.";
    private static final String MENSAJE_403 = "No tienes permiso para hacer esto.";

    @Bean
    JwtDecoder jwtDecoder(@Value("${livesmanage.jwt.secreto}") String secreto) {
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 caracteres (HS256).");
        }
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(bytes, "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("ms-auth")); // firma, vencimiento e iss
        return decoder;
    }

    @Bean
    SecurityFilterChain filtros(HttpSecurity http) throws Exception {
        JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();
        roles.setAuthoritiesClaimName("rol");
        roles.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter convertidor = new JwtAuthenticationConverter();
        convertidor.setJwtGrantedAuthoritiesConverter(roles);

        return http
                // Sin cookies: el token viaja en el header Authorization, así que no hay CSRF que proteger.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/error").permitAll()
                        // shortcut: el rol sale del JWT (hasta 8 h), como en ms-clientas; revisarlo en ms-auth si hiciera falta.
                        .requestMatchers(HttpMethod.POST, "/api/lives/*/reabrir").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(convertidor))
                        .authenticationEntryPoint((req, res, e) -> responder(res, 401, MENSAJE_401))
                        .accessDeniedHandler((req, res, e) -> responder(res, 403, MENSAJE_403)))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> responder(res, 401, MENSAJE_401))
                        .accessDeniedHandler((req, res, ex) -> responder(res, 403, MENSAJE_403)))
                .build();
    }

    /** Mismo cuerpo { mensaje } que ManejadorErrores, para los rechazos que ocurren antes de llegar al controller. */
    private static void responder(HttpServletResponse respuesta, int estado, String mensaje) throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json;charset=UTF-8");
        respuesta.getWriter().write("{\"mensaje\":\"" + mensaje + "\"}"); // mensajes fijos, sin comillas que escapar
    }
}
