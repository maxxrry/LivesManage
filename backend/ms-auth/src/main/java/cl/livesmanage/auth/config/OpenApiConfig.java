package cl.livesmanage.auth.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/** Swagger en /swagger-ui.html (RNF-24). El botón Authorize recibe el token del login. */
@Configuration
@OpenAPIDefinition(info = @Info(title = "ms-auth", description = "Usuarios, roles y login de LivesManage", version = "1"))
@SecurityScheme(name = "jwt", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {}
