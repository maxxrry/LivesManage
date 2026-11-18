package cl.livesmanage.lives.repository;

import cl.livesmanage.lives.model.EstadoSesion;
import cl.livesmanage.lives.model.Sesion;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SesionRepository extends JpaRepository<Sesion, String> {

    boolean existsByEstado(EstadoSesion estado);

    List<Sesion> findAllByOrderByInicioDesc();

    List<Sesion> findByIdIn(Collection<String> ids);

    /** La sesión bloqueada hasta el fin de la transacción: así anotar o cobrar no se cruza con finalizar el cierre. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Sesion s where s.id = :id")
    Optional<Sesion> bloquear(@Param("id") String id);
}
