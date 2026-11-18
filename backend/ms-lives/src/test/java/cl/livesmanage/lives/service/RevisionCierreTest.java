package cl.livesmanage.lives.service;

import static org.assertj.core.api.Assertions.assertThat;

import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.EstadoPrenda;
import cl.livesmanage.lives.model.Linea;
import cl.livesmanage.lives.model.Prenda;
import java.util.List;
import org.junit.jupiter.api.Test;

/** RF-11, D-27 y D-47: mismas reglas que revisarCierre del frontend. */
class RevisionCierreTest {

    private static Linea linea(EstadoPago pago, int... precios) {
        Linea linea = new Linea();
        linea.setEstadoPago(pago);
        for (int precio : precios) linea.agregar(new Prenda(precio));
        return linea;
    }

    @Test
    void sinPendientesEstaListoAunqueNoHayaBolsasNiEntregas() {
        RevisionCierre revision = RevisionCierre.de(List.of(linea(EstadoPago.PAGADO, 6000), linea(EstadoPago.NO_PAGO, 4000)));

        assertThat(revision.listo()).isTrue();
    }

    @Test
    void cuentaLasLineasPendientes() {
        RevisionCierre revision = RevisionCierre.de(List.of(
                linea(EstadoPago.PENDIENTE, 5000), linea(EstadoPago.PENDIENTE, 3000), linea(EstadoPago.PAGADO, 6000)));

        assertThat(revision.pendientes()).isEqualTo(2);
        assertThat(revision.listo()).isFalse();
    }

    @Test
    void unaLineaDeCeroQuedaFuera() {
        Linea todoCancelado = linea(EstadoPago.PENDIENTE, 6000);
        todoCancelado.getPrendas().get(0).setEstado(EstadoPrenda.CANCELADA);

        assertThat(RevisionCierre.de(List.of(todoCancelado)).listo()).isTrue();
    }
}
