package cl.livesmanage.auth.exception;

/** Correo inexistente, contraseña incorrecta o usuario desactivado: los tres dan el mismo error (RF-01). */
public class CredencialesInvalidasException extends RuntimeException {

    public static final String MENSAJE = "Correo o contraseña incorrectos.";

    public CredencialesInvalidasException() {
        super(MENSAJE);
    }
}
