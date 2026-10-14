package cl.livesmanage.clientas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Ficha de una clienta (RF-12). Solo el nombre es obligatorio. Nunca se borra: se desactiva. */
@Entity
@Table(name = "clienta", indexes = {
        @Index(name = "ix_clienta_tiktok", columnList = "usuario_tiktok"),
        @Index(name = "ix_clienta_telefono_digitos", columnList = "telefono_digitos")
})
@Getter
@Setter
@NoArgsConstructor
public class Clienta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 100)
    private String nombre;

    /** Guardado como "@usuario" en minúsculas (D-28). 61: hasta 60 escritos más el "@" que se agrega. */
    @Column(name = "usuario_tiktok", length = 61)
    private String usuarioTiktok;

    /** Como se escribió. */
    @Column(length = 30)
    private String telefono;

    /** Últimos 9 dígitos del teléfono, para buscar duplicados (D-28). */
    @Column(name = "telefono_digitos", length = 9)
    private String telefonoDigitos;

    /** null si no tiene. */
    @Embedded
    private Direccion direccion;

    @Column(nullable = false)
    private boolean activa = true;

    /** Cuándo se registró: solo una clienta recién creada se puede borrar (Deshacer, D-11 y D-37). */
    @Column(name = "creada")
    private Instant creada;
}
