package cl.livesmanage.lives.repository;

import cl.livesmanage.lives.model.Linea;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LineaRepository extends JpaRepository<Linea, String> {

    /** Con sus prendas en la misma consulta: la hoja y los totales las necesitan siempre. */
    @EntityGraph(attributePaths = "prendas")
    List<Linea> findBySesionId(String sesionId);

    @EntityGraph(attributePaths = "prendas")
    List<Linea> findBySesionIdIn(List<String> sesionIds);

    Optional<Linea> findBySesionIdAndClientaId(String sesionId, String clientaId);

    Optional<Linea> findByIdAndSesionId(String id, String sesionId);

    boolean existsByEntregaId(String entregaId);

    long countByEntregaId(String entregaId);

    /** Historial de una clienta (RF-13). */
    @EntityGraph(attributePaths = "prendas")
    List<Linea> findByClientaId(String clientaId);

    /** Todas las líneas, para el ranking y las inactivas (RF-14). */
    @Override
    @EntityGraph(attributePaths = "prendas")
    List<Linea> findAll();

    /** D-28: al renombrar una clienta se actualiza la copia del nombre en todas sus líneas, también en lives Cerrados. */
    @Modifying
    @Query("update Linea l set l.clientaNombre = :nombre, l.version = l.version + 1 where l.clientaId = :clientaId and l.clientaNombre <> :nombre")
    int renombrarClienta(@Param("clientaId") String clientaId, @Param("nombre") String nombre);
}
