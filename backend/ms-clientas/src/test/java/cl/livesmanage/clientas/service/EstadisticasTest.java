package cl.livesmanage.clientas.service;

import static org.assertj.core.api.Assertions.assertThat;

import cl.livesmanage.clientas.dto.ClientaInactiva;
import cl.livesmanage.clientas.dto.CriterioRanking;
import cl.livesmanage.clientas.dto.PosicionRanking;
import cl.livesmanage.clientas.dto.ResumenCompras;
import cl.livesmanage.clientas.model.Clienta;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** RF-14: mismas reglas que rankingDeClientas y clientasInactivas del frontend (D-30). */
class EstadisticasTest {

    private static Clienta clienta(String id, String nombre) {
        Clienta c = new Clienta();
        c.setId(id);
        c.setNombre(nombre);
        return c;
    }

    private static ResumenCompras compras(String clientaId, long total, long cantidad) {
        return new ResumenCompras(clientaId, total, cantidad, Instant.parse("2026-10-15T23:00:00Z"));
    }

    private static List<String> nombres(List<PosicionRanking> ranking) {
        return ranking.stream().map(p -> p.clienta().nombre()).toList();
    }

    private final Clienta flo = clienta("c-flo", "Florencia");
    private final Clienta gabi = clienta("c-gabi", "Gabriela");
    private final Clienta javi = clienta("c-javi", "Javiera");

    @Test
    void elRankingOrdenaPorTotalGastadoYDesempataPorCompras() {
        List<PosicionRanking> ranking = Estadisticas.ranking(List.of(flo, gabi, javi),
                List.of(compras("c-flo", 20000, 1), compras("c-gabi", 50000, 2), compras("c-javi", 20000, 3)), CriterioRanking.TOTAL);

        assertThat(nombres(ranking)).containsExactly("Gabriela", "Javiera", "Florencia");
        assertThat(ranking.get(0).totalGastado()).isEqualTo(50000);
        assertThat(ranking.get(0).compras()).isEqualTo(2);
    }

    @Test
    void elRankingOrdenaPorComprasYDesempataPorTotalGastado() {
        List<PosicionRanking> ranking = Estadisticas.ranking(List.of(flo, gabi, javi),
                List.of(compras("c-flo", 20000, 2), compras("c-gabi", 50000, 1), compras("c-javi", 30000, 2)), CriterioRanking.COMPRAS);

        assertThat(nombres(ranking)).containsExactly("Javiera", "Florencia", "Gabriela");
    }

    @Test
    void conTodoIgualElRankingOrdenaPorNombreEnEspanol() {
        List<PosicionRanking> ranking = Estadisticas.ranking(
                List.of(clienta("z", "Zoe"), clienta("n", "Ñusta"), clienta("a", "Ángela"), clienta("b", "Bea")),
                List.of(compras("z", 1000, 1), compras("n", 1000, 1), compras("a", 1000, 1), compras("b", 1000, 1)), CriterioRanking.TOTAL);

        assertThat(nombres(ranking)).containsExactly("Ángela", "Bea", "Ñusta", "Zoe");
    }

    @Test
    void elOrdenPorNombreRespetaLosEspaciosComoElFrontend() {
        List<PosicionRanking> ranking = Estadisticas.ranking(
                List.of(clienta("b", "Anabel"), clienta("a", "Ana Soto"), clienta("c", "Ana")),
                List.of(compras("a", 1000, 1), compras("b", 1000, 1), compras("c", 1000, 1)), CriterioRanking.TOTAL);

        assertThat(nombres(ranking)).containsExactly("Ana", "Ana Soto", "Anabel");
    }

    @Test
    void elRankingDejaFueraASinComprasPeroIncluyeADesactivadas() {
        gabi.setActiva(false);

        List<PosicionRanking> ranking = Estadisticas.ranking(List.of(flo, gabi), List.of(compras("c-gabi", 5000, 1)), CriterioRanking.TOTAL);

        assertThat(nombres(ranking)).containsExactly("Gabriela");
    }

    @Test
    void elRankingIgnoraComprasDeUnaClientaQueYaNoTieneFicha() {
        assertThat(Estadisticas.ranking(List.of(flo), List.of(compras("c-borrada", 5000, 1)), CriterioRanking.TOTAL)).isEmpty();
    }

    private static List<ClientaInactiva> inactivasDesde(Clienta c, String ultimaCompra, String hoy) {
        return Estadisticas.inactivas(List.of(c), List.of(new ResumenCompras(c.getId(), 5000, 1, Instant.parse(ultimaCompra))), LocalDate.parse(hoy), 60);
    }

    @Test
    void unaClientaSinComprasHace61DiasEsInactivaYConExactamente60No() {
        List<ClientaInactiva> inactivas = inactivasDesde(flo, "2026-09-30T15:00:00Z", "2026-11-30");

        assertThat(inactivas).hasSize(1);
        assertThat(inactivas.get(0).diasSinComprar()).isEqualTo(61);
        assertThat(inactivas.get(0).ultimaCompra()).isEqualTo(Instant.parse("2026-09-30T15:00:00Z"));
        assertThat(inactivasDesde(flo, "2026-10-01T15:00:00Z", "2026-11-30")).isEmpty();
    }

    @Test
    void losDiasSeCuentanEnHoraDeChile() {
        // 02:00 UTC del 01/10 todavía es 30/09 en Chile.
        assertThat(inactivasDesde(flo, "2026-10-01T02:00:00Z", "2026-11-30")).hasSize(1);
    }

    @Test
    void lasInactivasDejanFueraADesactivadasYASinCompras() {
        gabi.setActiva(false);
        List<ResumenCompras> antiguas = List.of(new ResumenCompras("c-gabi", 5000, 1, Instant.parse("2026-01-01T15:00:00Z")));

        assertThat(Estadisticas.inactivas(List.of(flo, gabi), antiguas, LocalDate.parse("2026-11-30"), 60)).isEmpty();
    }

    @Test
    void lasInactivasPartenPorLaQueLlevaMasTiempoSinComprar() {
        List<ResumenCompras> compras = List.of(
                new ResumenCompras("c-flo", 5000, 1, Instant.parse("2026-08-01T15:00:00Z")),
                new ResumenCompras("c-gabi", 5000, 1, Instant.parse("2026-03-01T15:00:00Z")),
                new ResumenCompras("c-javi", 5000, 1, Instant.parse("2026-08-01T15:00:00Z")));

        List<ClientaInactiva> inactivas = Estadisticas.inactivas(List.of(javi, flo, gabi), compras, LocalDate.parse("2026-11-30"), 60);

        assertThat(inactivas.stream().map(i -> i.clienta().nombre()).toList()).containsExactly("Gabriela", "Florencia", "Javiera");
    }
}
