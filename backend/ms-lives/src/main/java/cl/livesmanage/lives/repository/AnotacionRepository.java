package cl.livesmanage.lives.repository;

import cl.livesmanage.lives.model.Anotacion;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnotacionRepository extends JpaRepository<Anotacion, String> {

    List<Anotacion> findByLineaIdInAndDeshacibleTrue(Collection<String> lineaIds);

    /**
     * D-22: tras cualquier cambio en esas líneas, sus anotaciones ya no se pueden deshacer.
     * Entidad por entidad (no un UPDATE masivo), para que la copia en memoria de la transacción quede al día.
     */
    default void anularDeshacer(Collection<String> lineaIds) {
        findByLineaIdInAndDeshacibleTrue(lineaIds).forEach(a -> a.setDeshacible(false));
    }
}
