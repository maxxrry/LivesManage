package cl.livesmanage.lives.repository;

import cl.livesmanage.lives.model.Linea;
import cl.livesmanage.lives.dto.ResumenCompras;
import java.time.Instant;
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

    /**
     * RF-14 (D-29, D-42): compras por clienta en una sola consulta, para no cargar todas las prendas. Al sumar solo las
     * prendas vigentes, una línea que quedó en $0 no cuenta como compra.
     */
    @Query("""
            select new cl.livesmanage.lives.dto.ResumenCompras(l.clientaId, sum(p.precio), count(distinct l.id), max(s.inicio))
            from Linea l join l.prendas p, Sesion s
            where s.id = l.sesionId
              and s.estado = cl.livesmanage.lives.model.EstadoSesion.CERRADA
              and l.estadoPago = cl.livesmanage.lives.model.EstadoPago.PAGADO
              and p.estado = cl.livesmanage.lives.model.EstadoPrenda.VIGENTE
              and s.inicio >= :desde and s.inicio < :hasta
            group by l.clientaId
            """)
    List<ResumenCompras> comprasPorClienta(@Param("desde") Instant desde, @Param("hasta") Instant hasta);

    /** D-28: al renombrar una clienta se actualiza la copia del nombre en todas sus líneas, también en lives Cerrados. */
    @Modifying
    @Query("update Linea l set l.clientaNombre = :nombre, l.version = l.version + 1 where l.clientaId = :clientaId and l.clientaNombre <> :nombre")
    int renombrarClienta(@Param("clientaId") String clientaId, @Param("nombre") String nombre);
}
