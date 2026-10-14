package cl.livesmanage.clientas.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import cl.livesmanage.clientas.dto.ClientaDto;
import cl.livesmanage.clientas.dto.DatosClienta;
import cl.livesmanage.clientas.dto.DireccionDto;
import cl.livesmanage.clientas.dto.Duplicados;
import cl.livesmanage.clientas.exception.ReglaException;
import cl.livesmanage.clientas.model.Clienta;
import cl.livesmanage.clientas.model.Configuracion;
import cl.livesmanage.clientas.repository.ClientaRepository;
import cl.livesmanage.clientas.repository.ConfiguracionRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ClientaServiceTest {

    @Mock
    private ClientaRepository clientas;

    @Mock
    private ConfiguracionRepository configuracion;

    private ClientaService servicio;
    private Clienta gabriela;

    @BeforeEach
    void preparar() {
        servicio = new ClientaService(clientas, configuracion);
        gabriela = new Clienta();
        gabriela.setId("c-1");
        gabriela.setNombre("Gabriela Peña");
        gabriela.setUsuarioTiktok("@gabi.pena");
    }

    @Test
    void crearLimpiaLosDatosYDejaFueraLosCamposVacios() {
        when(clientas.save(any())).thenAnswer(i -> i.getArgument(0));

        ClientaDto creada = servicio.crear(new DatosClienta("  Flo   Ruiz ", " @Flo.Ruiz ", "  ", null));

        assertThat(creada.nombre()).isEqualTo("Flo Ruiz");
        assertThat(creada.usuarioTiktok()).isEqualTo("@flo.ruiz");
        assertThat(creada.telefono()).isNull();
        assertThat(creada.direccion()).isNull();
        assertThat(creada.activa()).isTrue();
    }

    @Test
    void laDireccionSinRegionQuedaEnMetropolitana() {
        when(clientas.save(any())).thenAnswer(i -> i.getArgument(0));

        ClientaDto creada = servicio.crear(new DatosClienta("Flo", null, "+56 9 1234 5678",
                new DireccionDto(" Los Aromos 1234 ", " Maipú ", " ", " ")));

        assertThat(creada.direccion()).isEqualTo(new DireccionDto("Los Aromos 1234", "Maipú", "Metropolitana", null));
        assertThat(creada.telefono()).isEqualTo("+56 9 1234 5678");
    }

    @Test
    void editarBorraLosCamposQueVienenVacios() {
        when(clientas.findById("c-1")).thenReturn(Optional.of(gabriela));

        ClientaDto editada = servicio.editar("c-1", new DatosClienta("Gabriela Peña", "", "9 8765 4321", null));

        assertThat(editada.usuarioTiktok()).isNull();
        assertThat(editada.telefono()).isEqualTo("9 8765 4321");
        assertThat(gabriela.getTelefonoDigitos()).isEqualTo("987654321");
    }

    @Test
    void duplicadosAvisaQuienTieneElTiktokOElTelefono() {
        when(clientas.findFirstByUsuarioTiktokAndIdNot("@gabi.pena", "c-9")).thenReturn(Optional.of(gabriela));
        when(clientas.findFirstByTelefonoDigitosAndIdNot("912345678", "c-9")).thenReturn(Optional.empty());

        Duplicados duplicados = servicio.duplicados("GABI.PENA", "+56 9 1234 5678", "c-9");

        assertThat(duplicados.tiktok().id()).isEqualTo("c-1");
        assertThat(duplicados.telefono()).isNull();
    }

    @Test
    void duplicadosSinDatosNoConsultaNada() {
        assertThat(servicio.duplicados(" ", null, null)).isEqualTo(new Duplicados(null, null));
    }

    @Test
    void desactivarYReactivar() {
        when(clientas.findById("c-1")).thenReturn(Optional.of(gabriela));

        assertThat(servicio.cambiarActiva("c-1", false).activa()).isFalse();
        assertThat(servicio.cambiarActiva("c-1", true).activa()).isTrue();
    }

    @Test
    void unaClientaQueNoExisteResponde404() {
        when(clientas.findById("c-9")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.obtener("c-9"))
                .isInstanceOf(ReglaException.class)
                .hasMessage("La clienta no existe.")
                .satisfies(e -> assertThat(((ReglaException) e).getEstado()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void losDiasDeInactividadParten60YSePuedenCambiar() {
        when(configuracion.findById(Configuracion.ID)).thenReturn(Optional.empty());
        assertThat(servicio.diasInactividad()).isEqualTo(60);

        when(configuracion.save(any())).thenAnswer(i -> i.getArgument(0));
        assertThat(servicio.cambiarDiasInactividad(90)).isEqualTo(90);
    }
}
