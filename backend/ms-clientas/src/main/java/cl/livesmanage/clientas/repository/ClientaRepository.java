package cl.livesmanage.clientas.repository;

import cl.livesmanage.clientas.model.Clienta;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientaRepository extends JpaRepository<Clienta, String> {

    Optional<Clienta> findFirstByUsuarioTiktokAndIdNot(String usuarioTiktok, String id);

    Optional<Clienta> findFirstByTelefonoDigitosAndIdNot(String telefonoDigitos, String id);
}
