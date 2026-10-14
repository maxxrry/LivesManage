package cl.livesmanage.lives.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Una clienta, sus prendas y su estado en un live. Una línea por clienta por live (UNIQUE). */
@Entity
@Table(name = "linea", uniqueConstraints = @UniqueConstraint(name = "uk_linea_sesion_clienta", columnNames = {"sesion_id", "clienta_id"}))
@Getter
@Setter
@NoArgsConstructor
public class Linea {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @Column(name = "sesion_id", nullable = false, length = 36)
    private String sesionId;

    /** Id de la clienta en ms-clientas (otra base: sin clave foránea). */
    @Column(name = "clienta_id", nullable = false, length = 36)
    private String clientaId;

    /** Copia del nombre, para que el live no dependa de que ms-clientas responda (D-03). */
    @Column(name = "clienta_nombre", nullable = false, length = 100)
    private String clientaNombre;

    @OneToMany(mappedBy = "linea", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden")
    private List<Prenda> prendas = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false, length = 20)
    private EstadoPago estadoPago = EstadoPago.PENDIENTE;

    /** Fecha y usuario del último cambio de pago (RF-07, RNF-09). */
    @Column(name = "pago_fecha")
    private Instant pagoFecha;

    @Column(name = "pago_usuario_id", length = 36)
    private String pagoUsuarioId;

    @Column(name = "bolsa_revisada", nullable = false)
    private boolean bolsaRevisada;

    /** Única referencia entre línea y entrega (D-05). */
    @Column(name = "entrega_id", length = 36)
    private String entregaId;

    /** Bloqueo optimista: si dos usuarias cambian la línea a la vez, la segunda recibe 409 en vez de pisar a la primera. */
    @Version
    private long version;

    /** Última modificación: la hoja se ordena por este campo (RF-08). */
    @Column(nullable = false)
    private Instant actualizada;

    public void agregar(Prenda prenda) {
        prenda.setLinea(this);
        prenda.setOrden(prendas.size());
        prendas.add(prenda);
    }

    /** Cambia el estado de pago y registra quién y cuándo (RF-07). */
    public void registrarPago(EstadoPago estado, String usuarioId, Instant ahora) {
        this.estadoPago = estado;
        this.pagoFecha = ahora;
        this.pagoUsuarioId = usuarioId;
    }
}
