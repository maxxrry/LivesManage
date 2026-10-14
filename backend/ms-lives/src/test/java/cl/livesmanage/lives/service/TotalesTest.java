package cl.livesmanage.lives.service;

import static org.assertj.core.api.Assertions.assertThat;

import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.EstadoPrenda;
import cl.livesmanage.lives.model.Linea;
import cl.livesmanage.lives.model.Prenda;
import java.util.List;
import org.junit.jupiter.api.Test;

/** RF-08 y D-23: misma fórmula que totalesDeLineas del frontend. */
class TotalesTest {

    private static Linea linea(EstadoPago pago, int... precios) {
        Linea linea = new Linea();
        linea.setEstadoPago(pago);
        for (int precio : precios) linea.agregar(new Prenda(precio));
        return linea;
    }

    @Test
    void elTotalDeUnaLineaSumaSoloLasPrendasVigentes() {
        Linea gabriela = linea(EstadoPago.PENDIENTE, 6000, 6000, 5000);
        assertThat(Totales.deLinea(gabriela)).isEqualTo(17000);

        gabriela.getPrendas().get(0).setEstado(EstadoPrenda.CANCELADA); // RF-06: quitar $6.000 baja $6.000
        assertThat(Totales.deLinea(gabriela)).isEqualTo(11000);
    }

    @Test
    void totalesDelLive() {
        Totales totales = Totales.de(List.of(
                linea(EstadoPago.PAGADO, 6000, 4000),
                linea(EstadoPago.PENDIENTE, 5000),
                linea(EstadoPago.NO_PAGO, 3000),
                linea(EstadoPago.PENDIENTE))); // todo cancelado o vacío: igual cuenta como clienta

        assertThat(totales.total()).isEqualTo(18000);
        assertThat(totales.pagado()).isEqualTo(10000);
        assertThat(totales.pendiente()).isEqualTo(5000); // lo No pagó ya no se cobra (D-23)
        assertThat(totales.clientas()).isEqualTo(4);
    }

    @Test
    void unLiveSinLineasEstaEnCero() {
        assertThat(Totales.de(List.of())).isEqualTo(new Totales(0, 0, 0, 0));
    }
}
