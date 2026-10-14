package cl.livesmanage.clientas.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Una regla del negocio impide la operación. Lleva el código HTTP y, si aplica, el campo culpable,
 * para que el frontend muestre el mensaje junto a ese campo.
 */
@Getter
public class ReglaException extends RuntimeException {

    private final HttpStatus estado;
    private final String campo;

    public ReglaException(HttpStatus estado, String campo, String mensaje) {
        super(mensaje);
        this.estado = estado;
        this.campo = campo;
    }
}
