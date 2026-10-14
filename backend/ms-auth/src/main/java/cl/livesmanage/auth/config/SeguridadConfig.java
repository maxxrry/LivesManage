package cl.livesmanage.auth.config;

import cl.livesmanage.auth.service.JwtService;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

/** Todo exige un JWT válido salvo el login y Swagger (RNF-07). El claim "rol" pasa a ROLE_ADMIN o ROLE_VENDEDOR. */
@Configuration
public class SeguridadConfig {

    @Bean
    SecretKey claveJwt(@Value("${livesmanage.jwt.secreto}") String secreto) {
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 caracteres (HS256).");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey clave) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(clave));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey clave) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(clave).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(JwtService.EMISOR)); // firma, vencimiento e iss
        return decoder;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
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
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/error").permitAll()
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

    private static final String MENSAJE_401 = "Tu sesión expiró o no es válida. Vuelve a iniciar sesión.";
    private static final String MENSAJE_403 = "No tienes permiso para hacer esto.";

    /** Mismo cuerpo { mensaje } que ManejadorErrores, para los rechazos que ocurren antes de llegar al controller. */
    private static void responder(HttpServletResponse respuesta, int estado, String mensaje) throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json;charset=UTF-8");
        respuesta.getWriter().write("{\"mensaje\":\"" + mensaje + "\"}"); // mensajes fijos, sin comillas que escapar
    }
}
