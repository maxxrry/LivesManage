package cl.livesmanage.lives.repository;

import cl.livesmanage.lives.model.EstadoSesion;
import cl.livesmanage.lives.model.Sesion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SesionRepository extends JpaRepository<Sesion, String> {

    boolean existsByEstado(EstadoSesion estado);

    List<Sesion> findAllByOrderByInicioDesc();
}
