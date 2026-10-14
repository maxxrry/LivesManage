package cl.livesmanage.lives.service;

import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.EstadoPrenda;
import cl.livesmanage.lives.model.Linea;
import java.util.List;

/**
 * RF-08: totales de un live, siempre calculados desde las prendas vigentes (RNF-11). Nunca se guardan.
 * Misma fórmula que totalesDeLineas del frontend (D-23). Montos en CLP enteros.
 */
public record Totales(int total, int pagado, int pendiente, int clientas) {

    public static int deLinea(Linea linea) {
        return linea.getPrendas().stream()
                .filter(p -> p.getEstado() == EstadoPrenda.VIGENTE)
                .mapToInt(p -> p.getPrecio())
                .sum();
    }

    public static Totales de(List<Linea> lineas) {
        int total = 0;
        int pagado = 0;
        int pendiente = 0;
        for (Linea linea : lineas) {
            int monto = deLinea(linea);
            total += monto;
            if (linea.getEstadoPago() == EstadoPago.PAGADO) pagado += monto;
            if (linea.getEstadoPago() == EstadoPago.PENDIENTE) pendiente += monto;
        }
        return new Totales(total, pagado, pendiente, lineas.size());
    }
}
