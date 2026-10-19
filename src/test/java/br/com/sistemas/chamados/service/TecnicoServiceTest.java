package br.com.sistemas.chamados.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.dto.TecnicoRequest;
import br.com.sistemas.chamados.entity.Perfil;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.TecnicoRepository;

@SpringBootTest
@Transactional
class TecnicoServiceTest {

    @Autowired
    private TecnicoService service;

    @Autowired
    private TecnicoRepository repository;

    @Test
    void criarTecnicoNormalizaEmail() {
        var criado = service.criar(new TecnicoRequest("João", " JOAO@EXAMPLE.COM ", Perfil.TECNICO));

        assertThat(criado.id()).isNotNull();
        assertThat(criado.email()).isEqualTo("joao@example.com");
        assertThat(criado.perfil()).isEqualTo(Perfil.TECNICO);
        assertThat(repository.existsByEmailIgnoreCase("joao@example.com")).isTrue();
    }

    @Test
    void rejeitaEmailDuplicadoSemDiferenciarMaiusculas() {
        service.criar(new TecnicoRequest("João", "joao@example.com", Perfil.TECNICO));

        assertThatThrownBy(() -> service.criar(
                new TecnicoRequest("Joana", "JOAO@EXAMPLE.COM", Perfil.ADMIN)))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("Já existe um tecnico");
    }
}
