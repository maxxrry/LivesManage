package cl.livesmanage.lives.service;

import cl.livesmanage.lives.model.Entrega;
import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.Linea;
import cl.livesmanage.lives.model.TipoEntrega;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * RF-11: lo que falta para finalizar el cierre. Mismas reglas que revisarCierre del frontend (D-27): todas las bolsas
 * revisadas, ninguna línea Pendiente y entrega (con dirección si es despacho) en cada línea Pagada. Las líneas de $0
 * quedan fuera de las reglas de pago y entrega, pero su bolsa sí se revisa.
 */
public record RevisionCierre(int bolsas, int pendientes, int sinEntrega) {

    public static RevisionCierre de(List<Linea> lineas, List<Entrega> entregas) {
        Map<String, Entrega> porId = entregas.stream().collect(Collectors.toMap(Entrega::getId, Function.identity()));
        int bolsas = 0;
        int pendientes = 0;
        int sinEntrega = 0;
        for (Linea linea : lineas) {
            if (!linea.isBolsaRevisada()) bolsas++;
            if (Totales.deLinea(linea) == 0) continue;
            if (linea.getEstadoPago() == EstadoPago.PENDIENTE) pendientes++;
            if (linea.getEstadoPago() == EstadoPago.PAGADO) {
                Entrega entrega = linea.getEntregaId() == null ? null : porId.get(linea.getEntregaId());
                if (entrega == null || (entrega.getTipo() == TipoEntrega.DESPACHO && entrega.getDireccion() == null)) sinEntrega++;
            }
        }
        return new RevisionCierre(bolsas, pendientes, sinEntrega);
    }

    public boolean listo() {
        return bolsas == 0 && pendientes == 0 && sinEntrega == 0;
    }
}
