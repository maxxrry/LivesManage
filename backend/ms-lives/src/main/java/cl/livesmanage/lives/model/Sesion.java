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

/** Sesión de live (RF-04): Abierta → En cierre → Cerrada. */
@Entity
@Table(name = "sesion")
@Getter
@NoArgsConstructor
public class Sesion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @Column(length = 100)
    private String nombre;

    @Column(nullable = false)
    private Instant inicio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoSesion estado;

    /**
     * true solo mientras está Abierta; si no, null. Es UNIQUE: la base misma impide dos lives Abiertos
     * aunque dos personas abran al mismo tiempo (MySQL admite varios null en un índice único).
     */
    @Column(unique = true)
    private Boolean abierta;

    public Sesion(String nombre, Instant inicio) {
        this.nombre = nombre;
        this.inicio = inicio;
        setEstado(EstadoSesion.ABIERTA);
    }

    public void setEstado(EstadoSesion estado) {
        this.estado = estado;
        this.abierta = estado == EstadoSesion.ABIERTA ? Boolean.TRUE : null;
    }
}
