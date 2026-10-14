package cl.livesmanage.clientas.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Mismas reglas que frontend/src/utils/clientas.ts (D-28). */
class NormalizarTest {

    @Test
    void tiktokSinArrobaEspaciosNiMayusculasSeGuardaComoArrobaUsuario() {
        assertThat(Normalizar.tiktok("  @@Gabi.Pena ")).isEqualTo("@gabi.pena");
        assertThat(Normalizar.tiktok("gabi pena")).isEqualTo("@gabipena");
        assertThat(Normalizar.tiktok(" @ ")).isNull();
        assertThat(Normalizar.tiktok(null)).isNull();
    }

    @Test
    void telefonoSeComparaPorSusUltimos9Digitos() {
        assertThat(Normalizar.digitosTelefono("+56 9 1234 5678")).isEqualTo("912345678");
        assertThat(Normalizar.digitosTelefono("9 1234 5678")).isEqualTo("912345678");
        assertThat(Normalizar.digitosTelefono("sin número")).isNull();
        assertThat(Normalizar.digitosTelefono(null)).isNull();
    }

    @Test
    void elNombreColapsaEspaciosYElRestoSoloSeRecorta() {
        assertThat(Normalizar.nombre("  Gabriela   Peña ")).isEqualTo("Gabriela Peña");
        assertThat(Normalizar.recortar(" Depto 2  /  timbre ")).isEqualTo("Depto 2  /  timbre");
        assertThat(Normalizar.nombre("   ")).isNull();
        assertThat(Normalizar.recortar(null)).isNull();
    }
}
