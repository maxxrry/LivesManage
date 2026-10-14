package cl.livesmanage.lives.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Dirección de despacho con campos separados (D-04). Columnas de la tabla entrega. */
@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class Direccion {

    @Column(name = "direccion_calle", length = 200)
    private String calle;

    @Column(name = "direccion_comuna", length = 100)
    private String comuna;

    @Column(name = "direccion_region", length = 100)
    private String region;

    @Column(name = "direccion_referencia", length = 200)
    private String referencia;
}
