package cl.livesmanage.clientas.service;

import cl.livesmanage.clientas.cliente.LivesCliente;
import cl.livesmanage.clientas.dto.ClientaInactiva;
import cl.livesmanage.clientas.dto.CriterioRanking;
import cl.livesmanage.clientas.dto.IndicadoresClienta;
import cl.livesmanage.clientas.dto.PosicionRanking;
import cl.livesmanage.clientas.dto.ResumenCompras;
import cl.livesmanage.clientas.exception.ReglaException;
import cl.livesmanage.clientas.repository.ClientaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** RF-13 y RF-14: une las fichas con las compras que entrega ms-lives (D-42). Sin transacción: no retiene la base durante esa llamada. */
@Slf4j
@Service
@RequiredArgsConstructor
public class EstadisticasService {

    private final ClientaRepository clientas;
    private final ClientaService fichas;
    private final LivesCliente lives;

    public IndicadoresClienta indicadores(String clientaId) {
        fichas.obtener(clientaId); // 404 si la clienta no existe
        return Estadisticas.indicadores(desdeLives(() -> lives.historial(clientaId)));
    }

    public List<PosicionRanking> ranking(CriterioRanking criterio, LocalDate desde, LocalDate hasta) {
        return Estadisticas.ranking(clientas.findAll(), compras(desde, hasta), criterio);
    }

    public List<ClientaInactiva> inactivas() {
        return Estadisticas.inactivas(clientas.findAll(), compras(null, null), Estadisticas.hoyEnChile(), fichas.diasInactividad());
    }

    private List<ResumenCompras> compras(LocalDate desde, LocalDate hasta) {
        return desdeLives(() -> lives.comprasPorClienta(desde, hasta));
    }

    /** Sin las compras no se muestran datos incompletos: se avisa el error (a diferencia de la lista de clientas). */
    private <T> T desdeLives(Supplier<T> consulta) {
        try {
            return consulta.get();
        } catch (RuntimeException e) {
            log.warn("No se pudieron leer las compras desde ms-lives: {}", e.getMessage());
            throw new ReglaException(HttpStatus.SERVICE_UNAVAILABLE, null, "No se pudieron calcular las estadísticas. Intenta de nuevo.");
        }
    }
}
