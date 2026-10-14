package cl.livesmanage.lives.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Ítem anotado en una línea: solo tiene precio (sin talla, descripción ni código). */
@Entity
@Table(name = "prenda")
@Getter
@Setter
@NoArgsConstructor
public class Prenda {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "linea_id")
    private Linea linea;

    /** CLP entero (6 = $6.000 en la sintaxis; aquí 6000). */
    @Column(nullable = false)
    private int precio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPrenda estado = EstadoPrenda.VIGENTE;

    /** Posición en la línea, en el orden en que se anotó. */
    @Column(nullable = false)
    private int orden;

    public Prenda(int precio) {
        this.precio = precio;
    }
}
