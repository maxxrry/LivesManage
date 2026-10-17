package cl.livesmanage.lives.service;

import static org.assertj.core.api.Assertions.assertThat;

import cl.livesmanage.lives.model.Direccion;
import cl.livesmanage.lives.model.Entrega;
import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.EstadoPrenda;
import cl.livesmanage.lives.model.Linea;
import cl.livesmanage.lives.model.Prenda;
import cl.livesmanage.lives.model.TipoEntrega;
import java.util.List;
import org.junit.jupiter.api.Test;

/** RF-11 y D-27: mismas reglas que revisarCierre del frontend. */
class RevisionCierreTest {

    private static Linea linea(EstadoPago pago, boolean bolsa, String entregaId, int... precios) {
        Linea linea = new Linea();
        linea.setEstadoPago(pago);
        linea.setBolsaRevisada(bolsa);
        linea.setEntregaId(entregaId);
        for (int precio : precios) linea.agregar(new Prenda(precio));
        return linea;
    }

    private static Entrega entrega(String id, TipoEntrega tipo, Direccion direccion) {
        Entrega entrega = new Entrega();
        entrega.setId(id);
        entrega.setTipo(tipo);
        entrega.setDireccion(direccion);
        return entrega;
    }

    @Test
    void conTodoRevisadoCobradoYConEntregaEstaListo() {
        List<Entrega> entregas = List.of(entrega("e-1", TipoEntrega.RETIRO, null));
        RevisionCierre revision = RevisionCierre.de(List.of(
                linea(EstadoPago.PAGADO, true, "e-1", 6000),
                linea(EstadoPago.NO_PAGO, true, null, 4000)), entregas);

        assertThat(revision.listo()).isTrue();
    }

    @Test
    void cuentaBolsasSinRevisarPendientesYPagadasSinEntrega() {
        List<Entrega> entregas = List.of(entrega("e-desp", TipoEntrega.DESPACHO, null)); // despacho sin dirección
        RevisionCierre revision = RevisionCierre.de(List.of(
                linea(EstadoPago.PENDIENTE, false, null, 5000),
                linea(EstadoPago.PAGADO, true, null, 6000),
                linea(EstadoPago.PAGADO, true, "e-desp", 3000)), entregas);

        assertThat(revision.bolsas()).isEqualTo(1);
        assertThat(revision.pendientes()).isEqualTo(1);
        assertThat(revision.sinEntrega()).isEqualTo(2);
        assertThat(revision.listo()).isFalse();
    }

    @Test
    void unaLineaDeCeroQuedaFueraDePagoYEntregaPeroSuBolsaSeRevisa() {
        Linea todoCancelado = linea(EstadoPago.PENDIENTE, false, null, 6000);
        todoCancelado.getPrendas().get(0).setEstado(EstadoPrenda.CANCELADA);

        RevisionCierre revision = RevisionCierre.de(List.of(todoCancelado), List.of());

        assertThat(revision.pendientes()).isZero();
        assertThat(revision.sinEntrega()).isZero();
        assertThat(revision.bolsas()).isEqualTo(1);
    }
}
