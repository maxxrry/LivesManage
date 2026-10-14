package cl.livesmanage.clientas.service;

import java.util.Locale;

/** Limpieza de datos de clientas, igual que frontend/src/utils/clientas.ts (D-28). Un texto vacío queda como null. */
public final class Normalizar {

    private Normalizar() {}

    /** Nombre sin espacios sobrantes, también entre palabras; vacío → null. */
    public static String nombre(String texto) {
        String limpio = recortar(texto);
        return limpio == null ? null : limpio.replaceAll("\\s+", " ");
    }

    /** Sin espacios al inicio ni al final (como el front para teléfono y dirección); vacío → null. */
    public static String recortar(String texto) {
        if (texto == null) return null;
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    /** "  @@Gabi.Pena " → "@gabi.pena". */
    public static String tiktok(String texto) {
        if (texto == null) return null;
        String usuario = texto.trim().replaceFirst("^@+", "").replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        return usuario.isEmpty() ? null : "@" + usuario;
    }

    /** "+56 9 1234 5678" → "912345678": dos teléfonos son el mismo si coinciden sus últimos 9 dígitos. */
    public static String digitosTelefono(String texto) {
        if (texto == null) return null;
        String digitos = texto.replaceAll("\\D", "");
        return digitos.isEmpty() ? null : digitos.substring(Math.max(0, digitos.length() - 9));
    }
}
