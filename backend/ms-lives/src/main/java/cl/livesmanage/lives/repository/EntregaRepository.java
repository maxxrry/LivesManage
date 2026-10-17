package cl.livesmanage.lives.repository;

import cl.livesmanage.lives.model.Entrega;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EntregaRepository extends JpaRepository<Entrega, String> {

    List<Entrega> findBySesionId(String sesionId);

    Optional<Entrega> findByIdAndSesionId(String id, String sesionId);
}
