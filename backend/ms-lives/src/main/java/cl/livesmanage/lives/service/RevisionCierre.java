package cl.livesmanage.lives.service;

import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.Linea;
import java.util.List;

/**
 * RF-11: lo que falta para finalizar el cierre. Mismas reglas que revisarCierre del frontend: ninguna línea Pendiente.
 * Las líneas de $0 quedan fuera (D-27). Bolsas y entrega ya no se exigen: se registran en la ficha de la clienta (D-47).
 */
public record RevisionCierre(int pendientes) {

    public static RevisionCierre de(List<Linea> lineas) {
        int pendientes = 0;
        for (Linea linea : lineas) {
            if (Totales.deLinea(linea) > 0 && linea.getEstadoPago() == EstadoPago.PENDIENTE) pendientes++;
        }
        return new RevisionCierre(pendientes);
    }

    public boolean listo() {
        return pendientes == 0;
    }
}
