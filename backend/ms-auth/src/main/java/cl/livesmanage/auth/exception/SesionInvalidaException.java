package cl.livesmanage.auth.exception;

/** El token es válido, pero su usuario ya no existe o fue desactivado. */
public class SesionInvalidaException extends RuntimeException {

    public SesionInvalidaException() {
        super("Tu sesión ya no es válida. Vuelve a iniciar sesión.");
    }
}
