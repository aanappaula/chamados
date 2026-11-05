package br.com.sistemas.chamados.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.dto.CategoriaRequest;
import br.com.sistemas.chamados.exception.RegraNegocioException;

@SpringBootTest
@Transactional
class CategoriaServiceTest {

    @Autowired
    private CategoriaService service;

    @Test
    void rejeitaNomeDuplicadoSemDiferenciarMaiusculas() {
        service.criar(new CategoriaRequest("Infra", "Categoria de infraestrutura"));

        assertThatThrownBy(() -> service.criar(
                new CategoriaRequest("infra", "Outra categoria de infraestrutura")))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("Já existe uma categoria");
    }
}
