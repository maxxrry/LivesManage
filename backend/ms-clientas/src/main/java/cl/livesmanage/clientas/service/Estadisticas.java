package cl.livesmanage.clientas.service;

import cl.livesmanage.clientas.dto.ClientaDto;
import cl.livesmanage.clientas.dto.ClientaInactiva;
import cl.livesmanage.clientas.dto.CompraClienta;
import cl.livesmanage.clientas.dto.CriterioRanking;
import cl.livesmanage.clientas.dto.IndicadoresClienta;
import cl.livesmanage.clientas.dto.PosicionRanking;
import cl.livesmanage.clientas.dto.ResumenCompras;
import cl.livesmanage.clientas.model.Clienta;
import java.text.Collator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** RF-13 y RF-14: mismas reglas que indicadoresDeClienta, rankingDeClientas y clientasInactivas del frontend (D-29, D-30), sin acceso a datos. */
final class Estadisticas {

    private static final ZoneId CHILE = ZoneId.of("America/Santiago");

    private Estadisticas() {}

    /** Solo cuentan los lives Cerrados. Una compra es una línea Pagada de más de $0 (D-29). El total sale de las prendas vigentes (RNF-11). */
    static IndicadoresClienta indicadores(List<CompraClienta> historial) {
        List<CompraClienta> cerradas = historial.stream().filter(c -> "CERRADA".equals(c.sesion().estado())).toList();
        List<CompraClienta> compras = cerradas.stream().filter(c -> "PAGADO".equals(c.linea().estadoPago()) && monto(c) > 0).toList();
        long total = compras.stream().mapToLong(Estadisticas::monto).sum();
        // Redondeo a pesos enteros sin decimales: sumar la mitad antes de dividir.
        long ticket = compras.isEmpty() ? 0 : (total + compras.size() / 2) / compras.size();
        Instant ultima = compras.stream().map(c -> c.sesion().inicio()).max(Comparator.naturalOrder()).orElse(null);
        long canceladas = cerradas.stream().flatMap(c -> c.linea().prendas().stream()).filter(p -> "CANCELADA".equals(p.estado())).count();
        long sinPago = cerradas.stream().filter(c -> "NO_PAGO".equals(c.linea().estadoPago())).count();
        return new IndicadoresClienta(total, compras.size(), ticket, ultima, canceladas, sinPago);
    }

    private static long monto(CompraClienta compra) {
        return compra.linea().prendas().stream().filter(p -> "VIGENTE".equals(p.estado())).mapToLong(CompraClienta.PrendaCompra::precio).sum();
    }

    /** Quienes tienen compras en el período, también las desactivadas. Desempata con el otro criterio y luego por nombre. */
    static List<PosicionRanking> ranking(List<Clienta> clientas, List<ResumenCompras> compras, CriterioRanking criterio) {
        Map<String, ResumenCompras> porClienta = porClienta(compras);
        Comparator<PosicionRanking> porTotal = Comparator.comparingLong(PosicionRanking::totalGastado).reversed();
        Comparator<PosicionRanking> porCompras = Comparator.comparingLong(PosicionRanking::compras).reversed();
        Comparator<PosicionRanking> orden = criterio == CriterioRanking.TOTAL ? porTotal.thenComparing(porCompras) : porCompras.thenComparing(porTotal);
        return clientas.stream()
                .filter(c -> porClienta.containsKey(c.getId()))
                .map(c -> new PosicionRanking(ClientaDto.de(c), porClienta.get(c.getId()).totalGastado(), porClienta.get(c.getId()).compras()))
                .sorted(orden.thenComparing(p -> p.clienta().nombre(), espanol()))
                .toList();
    }

    /** Activas con al menos una compra y ninguna en los últimos `dias` días. Primero las que llevan más tiempo sin comprar. */
    static List<ClientaInactiva> inactivas(List<Clienta> clientas, List<ResumenCompras> compras, LocalDate hoy, int dias) {
        Map<String, ResumenCompras> porClienta = porClienta(compras);
        return clientas.stream()
                .filter(c -> c.isActiva() && porClienta.containsKey(c.getId()))
                .map(c -> {
                    var ultima = porClienta.get(c.getId()).ultimaCompra();
                    return new ClientaInactiva(ClientaDto.de(c), ultima, ChronoUnit.DAYS.between(ultima.atZone(CHILE).toLocalDate(), hoy));
                })
                .filter(i -> i.diasSinComprar() > dias)
                .sorted(Comparator.comparingLong(ClientaInactiva::diasSinComprar).reversed().thenComparing(i -> i.clienta().nombre(), espanol()))
                .toList();
    }

    static LocalDate hoyEnChile() {
        return LocalDate.now(CHILE);
    }

    private static Map<String, ResumenCompras> porClienta(List<ResumenCompras> compras) {
        return compras.stream().collect(Collectors.toMap(ResumenCompras::clientaId, Function.identity()));
    }

    /**
     * Ñ después de N y Á junto a A, como localeCompare(..., 'es') del frontend. Compara palabra por palabra porque Collator
     * ignora los espacios: sin esto, "Anabel" quedaría antes que "Ana Soto".
     */
    private static Comparator<String> espanol() {
        Collator collator = Collator.getInstance(Locale.of("es"));
        return (a, b) -> {
            String[] palabrasA = a.split(" ");
            String[] palabrasB = b.split(" ");
            for (int i = 0; i < Math.min(palabrasA.length, palabrasB.length); i++) {
                int orden = collator.compare(palabrasA[i], palabrasB[i]);
                if (orden != 0) return orden;
            }
            return palabrasA.length - palabrasB.length;
        };
    }
}
