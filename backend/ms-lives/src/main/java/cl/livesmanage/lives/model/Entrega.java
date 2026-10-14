package cl.livesmanage.lives.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Forma de entrega (RF-10). Puede agrupar varias líneas del mismo live; las líneas apuntan a ella con
 * Linea.entregaId (D-05). Se registra en el cierre (paso 6); aquí ya existe porque unir líneas la toca (D-19).
 */
@Entity
@Table(name = "entrega")
@Getter
@Setter
@NoArgsConstructor
public class Entrega {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @Column(name = "sesion_id", nullable = false, length = 36)
    private String sesionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoEntrega tipo;

    /** Solo en Despacho. */
    @Embedded
    private Direccion direccion;
}
