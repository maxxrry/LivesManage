package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.EstadoPrenda;
import cl.livesmanage.lives.model.Prenda;

public record PrendaDto(String id, int precio, EstadoPrenda estado) {

    public static PrendaDto de(Prenda p) {
        return new PrendaDto(p.getId(), p.getPrecio(), p.getEstado());
    }
}
