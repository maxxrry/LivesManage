package cl.livesmanage.lives.dto;

import cl.livesmanage.lives.model.EstadoPago;
import cl.livesmanage.lives.model.Linea;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** Tipo Linea del frontend. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LineaDto(
        String id,
        String sesionId,
        String clientaId,
        String clientaNombre,
        List<PrendaDto> prendas,
        EstadoPago estadoPago,
        CambioPagoDto pagoActualizado,
        boolean bolsaRevisada,
        String entregaId,
        String actualizada) {

    public static LineaDto de(Linea l) {
        CambioPagoDto pago = l.getPagoFecha() == null ? null : new CambioPagoDto(l.getPagoFecha().toString(), l.getPagoUsuarioId());
        return new LineaDto(l.getId(), l.getSesionId(), l.getClientaId(), l.getClientaNombre(),
                l.getPrendas().stream().map(PrendaDto::de).toList(), l.getEstadoPago(), pago, l.isBolsaRevisada(),
                l.getEntregaId(), l.getActualizada().toString());
    }
}
