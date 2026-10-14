package cl.livesmanage.clientas.exception;

import cl.livesmanage.clientas.dto.ErrorRespuesta;
import java.util.Map;
import java.util.TreeMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Mensajes comprensibles para el usuario; el detalle técnico queda solo en el log (RNF-14). Mismo formato que ms-auth (D-33). */
@Slf4j
@RestControllerAdvice
public class ManejadorErrores {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorRespuesta> datosInvalidos(MethodArgumentNotValidException e) {
        Map<String, String> campos = new TreeMap<>(); // orden fijo por nombre de campo: el validador no garantiza uno
        e.getBindingResult().getFieldErrors().forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        // El primer error como mensaje: la pantalla lo muestra tal cual (ej: "Falta la comuna de la dirección.").
        String mensaje = campos.isEmpty() ? "Revisa los datos ingresados." : campos.values().iterator().next();
        return ResponseEntity.badRequest().body(new ErrorRespuesta(mensaje, campos));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorRespuesta> cuerpoIlegible(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(new ErrorRespuesta("La petición no tiene el formato esperado."));
    }

    @ExceptionHandler(ReglaException.class)
    ResponseEntity<ErrorRespuesta> regla(ReglaException e) {
        Map<String, String> campos = e.getCampo() == null ? null : Map.of(e.getCampo(), e.getMessage());
        return ResponseEntity.status(e.getEstado()).body(new ErrorRespuesta(e.getMessage(), campos));
    }

    /** Choque en la base, por ejemplo dos guardados simultáneos de la configuración. Reintentar lo resuelve. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorRespuesta> choque(DataIntegrityViolationException e) {
        log.warn("Violación de integridad: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorRespuesta("No se pudo guardar porque otro cambio llegó al mismo tiempo. Intenta de nuevo."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorRespuesta> inesperado(Exception e) {
        // Ruta inexistente, método o tipo de contenido equivocado: errores del cliente con su propio código, no 500.
        if (e instanceof ErrorResponse respuesta && respuesta.getStatusCode().is4xxClientError()) {
            return ResponseEntity.status(respuesta.getStatusCode()).body(new ErrorRespuesta("La petición no es válida."));
        }
        log.error("Error inesperado", e);
        return ResponseEntity.internalServerError().body(new ErrorRespuesta("Ocurrió un error inesperado. Intenta de nuevo."));
    }
}
