package cl.livesmanage.auth.service;

import cl.livesmanage.auth.model.Usuario;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Emite el JWT que el gateway y los demás microservicios validan con la misma clave (JWT_SECRET). */
@Service
@RequiredArgsConstructor
public class JwtService {

    /** Suficiente para un live y su cierre (RNF-06). */
    static final Duration DURACION = Duration.ofHours(8);

    /** Emisor del token; los servicios rechazan tokens con otro "iss". */
    public static final String EMISOR = "ms-auth";

    private final JwtEncoder encoder;

    public String emitir(Usuario usuario) {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(EMISOR)
                .subject(usuario.getId())
                .issuedAt(ahora)
                .expiresAt(ahora.plus(DURACION))
                .claim("nombre", usuario.getNombre())
                .claim("rol", usuario.getRol().name())
                .build();
        JwsHeader cabecera = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(cabecera, claims)).getTokenValue();
    }
}
