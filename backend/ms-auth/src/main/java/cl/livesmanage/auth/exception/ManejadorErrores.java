package cl.livesmanage.auth.exception;

import cl.livesmanage.auth.dto.ErrorRespuesta;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Mensajes comprensibles para el usuario; el detalle técnico queda solo en el log (RNF-14). */
@Slf4j
@RestControllerAdvice
public class ManejadorErrores {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorRespuesta> datosInvalidos(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ErrorRespuesta("Revisa los datos ingresados.", campos));
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

    /** Hoy el único índice único es el correo: dos pedidos con el mismo correo al mismo tiempo. Si se agrega otro, distinguirlos aquí. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorRespuesta> correoRepetido(DataIntegrityViolationException e) {
        log.warn("Violación de integridad tratada como correo repetido: {}", e.getMostSpecificCause().getMessage());
        return regla(ReglaException.correoRepetido());
    }

    @ExceptionHandler({CredencialesInvalidasException.class, SesionInvalidaException.class})
    ResponseEntity<ErrorRespuesta> noAutorizado(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorRespuesta(e.getMessage()));
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
