package br.com.sistemas.chamados.repository;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.entity.Categoria;

@SpringBootTest
@Transactional
class CategoriaRepositoryTest {

    @Autowired
    CategoriaRepository repository;

    @Test
    void existsByNomeIgnoreCaseDetectsDuplicate() {
        Categoria c = new Categoria("Infra", "Categoria infra");
        repository.save(c);

        boolean exists = repository.existsByNomeIgnoreCase("infra");
        assertThat(exists).isTrue();
    }
}
