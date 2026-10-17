package cl.livesmanage.clientas.service;

import cl.livesmanage.clientas.cliente.LivesCliente;
import cl.livesmanage.clientas.dto.ClientaDto;
import cl.livesmanage.clientas.dto.DatosClienta;
import cl.livesmanage.clientas.dto.DireccionDto;
import cl.livesmanage.clientas.dto.Duplicados;
import cl.livesmanage.clientas.exception.ReglaException;
import cl.livesmanage.clientas.model.Clienta;
import cl.livesmanage.clientas.model.Configuracion;
import cl.livesmanage.clientas.model.Direccion;
import cl.livesmanage.clientas.repository.ClientaRepository;
import cl.livesmanage.clientas.repository.ConfiguracionRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** RF-12: fichas de clientas, con las reglas de D-28. Desactivar y los días de inactividad son solo de la Admin (SeguridadConfig). */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClientaService {

    /** Para las consultas "...AndIdNot" cuando no hay que excluir a nadie. */
    private static final String NINGUNA = "";

    /** Deshacer dura unos segundos en pantalla; 10 minutos da margen sin permitir borrar fichas antiguas. */
    static final Duration VENTANA_BORRADO = Duration.ofMinutes(10);

    private final ClientaRepository clientas;
    private final ConfiguracionRepository configuracion;
    private final LivesCliente lives;

    @Transactional(readOnly = true)
    public List<ClientaDto> listar() {
        return clientas.findAll(Sort.by("nombre")).stream().map(ClientaDto::de).toList();
    }

    @Transactional(readOnly = true)
    public ClientaDto obtener(String id) {
        return ClientaDto.de(buscar(id));
    }

    /** Un duplicado no bloquea: la pantalla avisa antes con duplicados() (D-28). */
    @Transactional
    public ClientaDto crear(DatosClienta datos) {
        Clienta clienta = new Clienta();
        aplicar(clienta, datos);
        clienta.setCreada(Instant.now());
        clienta = clientas.save(clienta);
        log.info("Clienta {} creada", clienta.getId());
        return ClientaDto.de(clienta);
    }

    /**
     * Un campo vacío se borra. Después de guardar, ms-lives iguala el nombre en las líneas (D-28); se avisa en cada edición
     * (solo cambia las líneas con otro nombre), así volver a guardar repara un aviso que falló.
     */
    @Transactional
    public ClientaDto editar(String id, DatosClienta datos) {
        Clienta clienta = buscar(id);
        aplicar(clienta, datos);
        alConfirmar(() -> lives.sincronizarNombre(id)); // solo si la ficha quedó guardada
        log.info("Clienta {} editada", id);
        return ClientaDto.de(clienta);
    }

    /** RF-10 y D-26: la dirección de un despacho reemplaza la de la ficha (una sola, sin historial). */
    @Transactional
    public ClientaDto guardarDireccion(String id, DireccionDto direccion) {
        Clienta clienta = buscar(id);
        clienta.setDireccion(direccion(direccion));
        return ClientaDto.de(clienta);
    }

    @Transactional(readOnly = true)
    public Duplicados duplicados(String usuarioTiktok, String telefono, String excluirId) {
        String tiktok = Normalizar.tiktok(usuarioTiktok);
        String digitos = Normalizar.digitosTelefono(telefono);
        String excluir = Objects.requireNonNullElse(excluirId, NINGUNA);
        ClientaDto conTiktok = tiktok == null ? null
                : clientas.findFirstByUsuarioTiktokAndIdNot(tiktok, excluir).map(ClientaDto::de).orElse(null);
        ClientaDto conTelefono = digitos == null ? null
                : clientas.findFirstByTelefonoDigitosAndIdNot(digitos, excluir).map(ClientaDto::de).orElse(null);
        return new Duplicados(conTiktok, conTelefono);
    }

    /**
     * Deshacer una anotación borra la clienta que esa anotación creó (D-11). Solo en sus primeros minutos,
     * para que no sirva para borrar fichas con historial: después, una clienta se desactiva (RF-12).
     */
    @Transactional
    public void borrarRecienCreada(String id) {
        Clienta clienta = buscar(id);
        if (clienta.getCreada() == null || clienta.getCreada().isBefore(Instant.now().minus(VENTANA_BORRADO))) {
            throw new ReglaException(HttpStatus.CONFLICT, null, "Solo se puede borrar una clienta recién creada. Desactívala en su ficha.");
        }
        clientas.delete(clienta);
        log.info("Clienta {} borrada al deshacer su anotación", id);
    }

    /** Baja lógica: conserva su historial (RF-12). */
    @Transactional
    public ClientaDto cambiarActiva(String id, boolean activa) {
        Clienta clienta = buscar(id);
        clienta.setActiva(activa);
        log.info("Clienta {} {}", id, activa ? "reactivada" : "desactivada");
        return ClientaDto.de(clienta);
    }

    @Transactional(readOnly = true)
    public int diasInactividad() {
        return configuracion.findById(Configuracion.ID).orElseGet(Configuracion::new).getDiasInactividad();
    }

    @Transactional
    public int cambiarDiasInactividad(int dias) {
        Configuracion actual = configuracion.findById(Configuracion.ID).orElseGet(Configuracion::new);
        actual.setDiasInactividad(dias);
        return configuracion.save(actual).getDiasInactividad();
    }

    private void aplicar(Clienta clienta, DatosClienta datos) {
        clienta.setNombre(Normalizar.nombre(datos.nombre()));
        clienta.setUsuarioTiktok(Normalizar.tiktok(datos.usuarioTiktok()));
        clienta.setTelefono(Normalizar.recortar(datos.telefono()));
        clienta.setTelefonoDigitos(Normalizar.digitosTelefono(datos.telefono()));
        clienta.setDireccion(datos.direccion() == null ? null : direccion(datos.direccion()));
    }

    private static Direccion direccion(DireccionDto d) {
        return new Direccion(
                Normalizar.recortar(d.calle()),
                Normalizar.recortar(d.comuna()),
                Objects.requireNonNullElse(Normalizar.recortar(d.region()), DireccionDto.REGION_POR_DEFECTO),
                Normalizar.recortar(d.referencia()));
    }

    private static void alConfirmar(Runnable accion) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            accion.run(); // sin transacción (pruebas unitarias): no hay nada que esperar
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                accion.run();
            }
        });
    }

    private Clienta buscar(String id) {
        return clientas.findById(id).orElseThrow(() -> new ReglaException(HttpStatus.NOT_FOUND, null, "La clienta no existe."));
    }
}
