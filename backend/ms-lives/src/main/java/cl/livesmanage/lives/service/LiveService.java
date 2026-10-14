package cl.livesmanage.lives.service;

import cl.livesmanage.lives.cliente.ClientasCliente;
import cl.livesmanage.lives.cliente.ClientasCliente.ClientaRef;
import cl.livesmanage.lives.dto.Destino;
import cl.livesmanage.lives.dto.EntregaDto;
import cl.livesmanage.lives.dto.LineaDto;
import cl.livesmanage.lives.dto.NuevaAnotacion;
import cl.livesmanage.lives.dto.ResultadoAnotar;
import cl.livesmanage.lives.dto.SesionDetalleDto;
import cl.livesmanage.lives.dto.SesionDto;
import cl.livesmanage.lives.dto.SesionResumenDto;
import cl.livesmanage.lives.exception.ReglaException;
import cl.livesmanage.lives.model.Anotacion;
import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.EstadoPrenda;
import cl.livesmanage.lives.model.EstadoSesion;
import cl.livesmanage.lives.model.Linea;
import cl.livesmanage.lives.model.Prenda;
import cl.livesmanage.lives.model.Sesion;
import cl.livesmanage.lives.repository.AnotacionRepository;
import cl.livesmanage.lives.repository.EntregaRepository;
import cl.livesmanage.lives.repository.LineaRepository;
import cl.livesmanage.lives.repository.SesionRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.IntPredicate;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * RF-04 a RF-08: lives, anotación rápida, correcciones y pagos. Mismas reglas que el sesionesService simulado del
 * frontend (D-11, D-18 a D-23). Cada operación de varios pasos va en una transacción (RNF-12).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LiveService {

    private final SesionRepository sesiones;
    private final LineaRepository lineas;
    private final AnotacionRepository anotaciones;
    private final EntregaRepository entregas;
    private final ClientasCliente clientas;

    // RF-04

    /**
     * Cada live con sus totales, el más reciente primero.
     * shortcut: carga todas las líneas con sus prendas; con años de lives, pasar a una consulta que sume por live.
     */
    @Transactional(readOnly = true)
    public List<SesionResumenDto> listar() {
        List<Sesion> todas = sesiones.findAllByOrderByInicioDesc();
        Map<String, List<Linea>> porSesion = lineas.findBySesionIdIn(todas.stream().map(Sesion::getId).toList()).stream()
                .collect(Collectors.groupingBy(Linea::getSesionId));
        return todas.stream().map(s -> SesionResumenDto.de(s, Totales.de(porSesion.getOrDefault(s.getId(), List.of())))).toList();
    }

    /** Solo puede haber un live Abierto; uno En cierre no bloquea. */
    @Transactional
    public SesionDto abrir(String nombre) {
        if (sesiones.existsByEstado(EstadoSesion.ABIERTA)) {
            throw new ReglaException(HttpStatus.CONFLICT, null, "Ya hay un live abierto. Continúa en él o termínalo antes de abrir otro.");
        }
        Sesion sesion = sesiones.saveAndFlush(new Sesion(Normalizar.texto(nombre), Instant.now()));
        log.info("Live {} abierto", sesion.getId());
        return SesionDto.de(sesion);
    }

    @Transactional(readOnly = true)
    public SesionDetalleDto obtener(String id) {
        Sesion sesion = buscarSesion(id);
        return new SesionDetalleDto(
                SesionDto.de(sesion),
                lineas.findBySesionId(id).stream().map(LineaDto::de).toList(),
                entregas.findBySesionId(id).stream().map(EntregaDto::de).toList());
    }

    // RF-05

    /**
     * Agrega las prendas a la línea de la clienta en el live, o crea la línea (y la clienta en ms-clientas si es nueva).
     * Valida todo antes de modificar: la anotación se guarda completa o no se guarda (RNF-12).
     */
    @Transactional
    public ResultadoAnotar anotar(String sesionId, NuevaAnotacion datos, String usuarioId) {
        Sesion sesion = buscarSesion(sesionId);
        if (sesion.getEstado() != EstadoSesion.ABIERTA) {
            throw new ReglaException(HttpStatus.CONFLICT, null, "El live no está abierto; no se puede anotar.");
        }
        if (datos.precios().stream().anyMatch(p -> p % 1000 != 0)) {
            throw new ReglaException(HttpStatus.BAD_REQUEST, "precios", "Precios no válidos.");
        }
        ClientaRef clienta = resolverClienta(sesionId, datos.destino());
        boolean clientaNueva = datos.destino().nuevaClienta() != null && !datos.destino().nuevaClienta().isBlank();
        List<Integer> precios = datos.precios();
        Instant ahora = Instant.now();
        Linea linea = lineas.findBySesionIdAndClientaId(sesionId, clienta.id()).orElse(null);
        if (linea != null) anotaciones.anularDeshacer(List.of(linea.getId())); // D-22: una anotación nueva cambia la línea
        Anotacion anotacion = new Anotacion();
        anotacion.setSesionId(sesionId);
        anotacion.setLineaCreada(linea == null);
        anotacion.setClientaCreadaId(clientaNueva ? clienta.id() : null);
        anotacion.setUsuarioId(usuarioId);
        anotacion.setFecha(ahora);
        anotacion.setTotal(precios.stream().mapToInt(Integer::intValue).sum());

        if (linea == null) {
            linea = new Linea();
            linea.setSesionId(sesionId);
            linea.setClientaId(clienta.id());
            linea.setClientaNombre(clienta.nombre());
        } else {
            anotacion.setActualizadaAnterior(linea.getActualizada());
            if (linea.getEstadoPago() == EstadoPago.PAGADO) {
                anotacion.setPagoAnteriorEstado(linea.getEstadoPago());
                anotacion.setPagoAnteriorFecha(linea.getPagoFecha());
                anotacion.setPagoAnteriorUsuarioId(linea.getPagoUsuarioId());
                linea.registrarPago(EstadoPago.PENDIENTE, usuarioId, ahora); // D-20: hay un monto sin cobrar
            }
        }
        precios.stream().map(Prenda::new).forEach(linea::agregar);
        linea.setActualizada(ahora);
        linea = lineas.saveAndFlush(linea);
        // Las nuevas son las últimas de la línea guardada (con merge, JPA guarda copias: los objetos de arriba no tienen id).
        List<Prenda> nuevas = linea.getPrendas().subList(linea.getPrendas().size() - precios.size(), linea.getPrendas().size());

        anotacion.setLineaId(linea.getId());
        anotacion.setPrendaIds(nuevas.stream().map(Prenda::getId).collect(Collectors.joining(",")));
        anotacion = anotaciones.save(anotacion);
        log.info("Anotación {} en el live {}: {} prenda(s) a la línea {}", anotacion.getId(), sesionId, nuevas.size(), linea.getId());
        return new ResultadoAnotar(anotacion.getId(), LineaDto.de(linea));
    }

    /**
     * D-11: elimina lo que creó la anotación (sus prendas, y la línea y la clienta si eran nuevas) y devuelve la línea
     * a como estaba, incluido su pago (D-20). Solo si la línea no cambió después (D-22) y el live sigue Abierto.
     */
    @Transactional
    public void deshacer(String sesionId, String anotacionId) {
        Anotacion anotacion = anotaciones.findById(anotacionId)
                .filter(a -> a.getSesionId().equals(sesionId) && a.isDeshacible())
                .orElseThrow(() -> new ReglaException(HttpStatus.CONFLICT, null, "La anotación ya no se puede deshacer."));
        if (buscarSesion(sesionId).getEstado() != EstadoSesion.ABIERTA) {
            throw new ReglaException(HttpStatus.CONFLICT, null, "La anotación ya no se puede deshacer.");
        }
        anotacion.setDeshacible(false); // queda registrada (RNF-09), pero no se deshace dos veces

        Linea linea = lineas.findById(anotacion.getLineaId()).orElse(null);
        if (linea != null) {
            if (anotacion.isLineaCreada()) {
                lineas.delete(linea);
            } else {
                Set<String> ids = Set.of(anotacion.getPrendaIds().split(","));
                linea.getPrendas().removeIf(p -> ids.contains(p.getId()));
                linea.setActualizada(Objects.requireNonNullElse(anotacion.getActualizadaAnterior(), linea.getActualizada()));
                if (anotacion.getPagoAnteriorEstado() != null) {
                    linea.registrarPago(anotacion.getPagoAnteriorEstado(), anotacion.getPagoAnteriorUsuarioId(), anotacion.getPagoAnteriorFecha());
                }
            }
        }
        if (anotacion.getClientaCreadaId() != null) borrarClientaAlConfirmar(anotacion.getClientaCreadaId());
        log.info("Anotación {} deshecha", anotacionId);
    }

    // RF-06 y RF-07

    /** Cancela una prenda vigente o restaura una cancelada. Nunca se borra ni reordena la hoja (D-18). */
    @Transactional
    public LineaDto alternarPrenda(String sesionId, String lineaId, String prendaId, String usuarioId) {
        Linea linea = lineaEditable(sesionId, lineaId);
        Prenda prenda = linea.getPrendas().stream().filter(p -> p.getId().equals(prendaId)).findFirst()
                .orElseThrow(() -> new ReglaException(HttpStatus.NOT_FOUND, null, "La prenda no existe."));
        anotaciones.anularDeshacer(List.of(lineaId));
        prenda.setEstado(prenda.getEstado() == EstadoPrenda.VIGENTE ? EstadoPrenda.CANCELADA : EstadoPrenda.VIGENTE);
        // D-20: restaurar en una línea Pagada agrega un monto sin cobrar. Cancelar la deja Pagada.
        if (prenda.getEstado() == EstadoPrenda.VIGENTE && linea.getEstadoPago() == EstadoPago.PAGADO) {
            linea.registrarPago(EstadoPago.PENDIENTE, usuarioId, Instant.now());
        }
        return LineaDto.de(linea);
    }

    /** Pasa la línea de Pendiente a Pagado o al revés, con fecha y usuario. No reordena la hoja (D-21). */
    @Transactional
    public LineaDto alternarPago(String sesionId, String lineaId, String usuarioId) {
        Linea linea = lineaEditable(sesionId, lineaId);
        if (linea.getEstadoPago() == EstadoPago.NO_PAGO) {
            throw new ReglaException(HttpStatus.CONFLICT, null, "\"No pagó\" se revisa en el cierre del live.");
        }
        anotaciones.anularDeshacer(List.of(lineaId));
        linea.registrarPago(linea.getEstadoPago() == EstadoPago.PAGADO ? EstadoPago.PENDIENTE : EstadoPago.PAGADO, usuarioId, Instant.now());
        return LineaDto.de(linea);
    }

    /**
     * Cambia la clienta de una línea. Si la elegida ya tiene línea en el live, las une con las reglas de D-19
     * y devuelve la línea resultante.
     */
    @Transactional
    public LineaDto cambiarClienta(String sesionId, String lineaId, Destino destino, String usuarioId) {
        Linea linea = lineaEditable(sesionId, lineaId);
        if (linea.getClientaId().equals(destino.clientaId())) return LineaDto.de(linea);

        ClientaRef clienta = resolverClienta(sesionId, destino);
        Linea otra = lineas.findBySesionIdAndClientaId(sesionId, clienta.id()).orElse(null);
        Instant ahora = Instant.now();
        anotaciones.anularDeshacer(otra == null ? List.of(lineaId) : List.of(lineaId, otra.getId()));

        if (otra == null) {
            linea.setClientaId(clienta.id());
            linea.setClientaNombre(clienta.nombre());
            linea.setActualizada(ahora);
            return LineaDto.de(linea);
        }

        // Las prendas pasan como copias: mover entidades entre colecciones con orphanRemoval las borraría.
        for (Prenda p : linea.getPrendas()) {
            Prenda copia = new Prenda(p.getPrecio());
            copia.setEstado(p.getEstado());
            otra.agregar(copia);
        }
        EstadoPago pago = otra.getEstadoPago() == EstadoPago.PAGADO && linea.getEstadoPago() == EstadoPago.PAGADO
                ? EstadoPago.PAGADO : EstadoPago.PENDIENTE;
        if (pago != otra.getEstadoPago()) otra.registrarPago(pago, usuarioId, ahora);
        otra.setBolsaRevisada(otra.isBolsaRevisada() && linea.isBolsaRevisada());
        String entregaUnida = linea.getEntregaId();
        if (otra.getEntregaId() == null) otra.setEntregaId(entregaUnida);
        otra.setActualizada(ahora);
        lineas.delete(linea);
        lineas.flush();
        // La entrega de la línea unida pudo quedar sin líneas (D-05: no existe sin líneas).
        if (entregaUnida != null && !lineas.existsByEntregaId(entregaUnida)) entregas.deleteById(entregaUnida);
        log.info("Línea {} unida a la línea {}", lineaId, otra.getId());
        return LineaDto.de(otra);
    }

    // Apoyo

    /**
     * La clienta del destino. Si ya tiene línea en el live se usa su copia del nombre, sin llamar a ms-clientas (D-03).
     * Una desactivada no aparece al anotar (D-28), así que no se le crea una línea nueva.
     * Una clienta nueva se crea en ms-clientas y se borra si después la transacción se revierte.
     */
    private ClientaRef resolverClienta(String sesionId, Destino destino) {
        if (destino.clientaId() != null && !destino.clientaId().isBlank()) {
            return lineas.findBySesionIdAndClientaId(sesionId, destino.clientaId())
                    .map(l -> new ClientaRef(l.getClientaId(), l.getClientaNombre(), true))
                    .orElseGet(() -> {
                        ClientaRef clienta = clientas.obtener(destino.clientaId());
                        if (!clienta.activa()) throw new ReglaException(HttpStatus.CONFLICT, null, "La clienta está desactivada.");
                        return clienta;
                    });
        }
        ClientaRef nueva = clientas.crear(Normalizar.texto(destino.nuevaClienta()));
        alTerminar(estado -> estado == TransactionSynchronization.STATUS_ROLLED_BACK, () -> clientas.borrarRecienCreada(nueva.id()));
        return nueva;
    }

    /** Deshacer (D-11): la clienta se borra en ms-clientas solo si la base confirmó el resto. */
    private void borrarClientaAlConfirmar(String clientaId) {
        alTerminar(estado -> estado == TransactionSynchronization.STATUS_COMMITTED, () -> clientas.borrarRecienCreada(clientaId));
    }

    /** Llamadas a ms-clientas que dependen de cómo terminó la transacción local (no son parte de ella). */
    private static void alTerminar(IntPredicate cuando, Runnable accion) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int estado) {
                if (cuando.test(estado)) accion.run();
            }
        });
    }

    private Sesion buscarSesion(String id) {
        return sesiones.findById(id).orElseThrow(() -> new ReglaException(HttpStatus.NOT_FOUND, null, "El live no existe."));
    }

    /** Línea de un live que se puede corregir: existe y el live no está Cerrado (RF-06). */
    private Linea lineaEditable(String sesionId, String lineaId) {
        if (buscarSesion(sesionId).getEstado() == EstadoSesion.CERRADA) {
            throw new ReglaException(HttpStatus.CONFLICT, null, "El live está cerrado: es solo lectura.");
        }
        return lineas.findByIdAndSesionId(lineaId, sesionId)
                .orElseThrow(() -> new ReglaException(HttpStatus.NOT_FOUND, null, "La línea no existe."));
    }

    /** Sin espacios sobrantes; vacío → null. */
    static final class Normalizar {
        private Normalizar() {}

        static String texto(String texto) {
            if (texto == null) return null;
            String limpio = texto.trim().replaceAll("\\s+", " ");
            return limpio.isEmpty() ? null : limpio;
        }
    }
}
