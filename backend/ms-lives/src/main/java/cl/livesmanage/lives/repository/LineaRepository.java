package cl.livesmanage.lives.repository;

import cl.livesmanage.lives.model.Linea;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LineaRepository extends JpaRepository<Linea, String> {

    /** Con sus prendas en la misma consulta: la hoja y los totales las necesitan siempre. */
    @EntityGraph(attributePaths = "prendas")
    List<Linea> findBySesionId(String sesionId);

    @EntityGraph(attributePaths = "prendas")
    List<Linea> findBySesionIdIn(List<String> sesionIds);

    Optional<Linea> findBySesionIdAndClientaId(String sesionId, String clientaId);

    Optional<Linea> findByIdAndSesionId(String id, String sesionId);

    boolean existsByEntregaId(String entregaId);
}
