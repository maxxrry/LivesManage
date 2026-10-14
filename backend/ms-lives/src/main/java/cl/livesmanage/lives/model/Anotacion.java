package cl.livesmanage.lives.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Registro de cada anotación (RF-05): quién y cuándo (RNF-09), y lo necesario para deshacerla (D-11).
 * Deja de ser deshacible apenas su línea cambia (D-22).
 */
@Entity
@Table(name = "anotacion")
@Getter
@Setter
@NoArgsConstructor
public class Anotacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @Column(name = "sesion_id", nullable = false, length = 36)
    private String sesionId;

    @Column(name = "linea_id", nullable = false, length = 36)
    private String lineaId;

    /** Ids de las prendas que agregó, separados por coma. */
    @Column(name = "prenda_ids", nullable = false, length = 2000)
    private String prendaIds;

    /** Suma de los precios anotados, para el registro. */
    @Column(nullable = false)
    private int total;

    @Column(name = "linea_creada", nullable = false)
    private boolean lineaCreada;

    @Column(name = "actualizada_anterior")
    private Instant actualizadaAnterior;

    /** Clienta que creó esta anotación (se borra al deshacer, D-11). */
    @Column(name = "clienta_creada_id", length = 36)
    private String clientaCreadaId;

    /** Pago de la línea antes de anotar, si la anotación la devolvió a Pendiente (D-20). */
    @Enumerated(EnumType.STRING)
    @Column(name = "pago_anterior_estado", length = 20)
    private EstadoPago pagoAnteriorEstado;

    @Column(name = "pago_anterior_fecha")
    private Instant pagoAnteriorFecha;

    @Column(name = "pago_anterior_usuario_id", length = 36)
    private String pagoAnteriorUsuarioId;

    @Column(nullable = false)
    private boolean deshacible = true;

    @Column(name = "usuario_id", nullable = false, length = 36)
    private String usuarioId;

    @Column(nullable = false)
    private Instant fecha;
}
