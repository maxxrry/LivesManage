package cl.livesmanage.clientas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Configuración de la tienda: una sola fila (id = 1). */
@Entity
@Table(name = "configuracion")
@Getter
@Setter
@NoArgsConstructor
public class Configuracion {

    public static final int ID = 1;
    public static final int DIAS_INACTIVIDAD_POR_DEFECTO = 60;

    @Id
    private Integer id = ID;

    /** Días sin comprar para que una clienta cuente como inactiva (RF-14). */
    @Column(name = "dias_inactividad", nullable = false)
    private int diasInactividad = DIAS_INACTIVIDAD_POR_DEFECTO;
}
