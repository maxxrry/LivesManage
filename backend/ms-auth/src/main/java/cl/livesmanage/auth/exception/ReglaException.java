package cl.livesmanage.auth.exception;

import org.springframework.http.HttpStatus;

/**
 * Una regla del negocio impide la operación. Lleva el código HTTP y, si aplica, el campo culpable,
 * para que el frontend muestre el mensaje junto a ese campo.
 */
public class ReglaException extends RuntimeException {

    private final HttpStatus estado;
    private final String campo;

    public ReglaException(HttpStatus estado, String campo, String mensaje) {
        super(mensaje);
        this.estado = estado;
        this.campo = campo;
    }

    public static ReglaException correoRepetido() {
        return new ReglaException(HttpStatus.CONFLICT, "correo", "Ya existe un usuario con ese correo.");
    }

    public static ReglaException noEncontrado() {
        return new ReglaException(HttpStatus.NOT_FOUND, null, "El usuario no existe.");
    }

    public HttpStatus getEstado() {
        return estado;
    }

    public String getCampo() {
        return campo;
    }
}
