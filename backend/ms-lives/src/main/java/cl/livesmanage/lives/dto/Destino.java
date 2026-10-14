package cl.livesmanage.lives.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;

/** A quién se anota: una clienta existente ({ clientaId }) o una nueva ({ nuevaClienta }), como DestinoAnotacion del frontend. */
public record Destino(
        @Size(max = 36) String clientaId,
        @Size(max = 100, message = "El nombre puede tener hasta 100 caracteres.") String nuevaClienta) {

    @AssertTrue(message = "Indica una clienta existente o el nombre de una nueva.")
    public boolean isUnoSolo() {
        boolean existente = clientaId != null && !clientaId.isBlank();
        boolean nueva = nuevaClienta != null && !nuevaClienta.isBlank();
        return existente != nueva;
    }
}
