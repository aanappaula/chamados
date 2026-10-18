package br.com.sistemas.chamados.repository;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.entity.Perfil;
import br.com.sistemas.chamados.entity.Tecnico;

@SpringBootTest
@Transactional
class TecnicoRepositoryTest {

    @Autowired
    TecnicoRepository repository;

    @Test
    void existsByEmailDetectsDuplicate() {
        Tecnico t = new Tecnico("Joao", "joao@example.com", Perfil.TECNICO);
        repository.save(t);

        boolean exists = repository.existsByEmailIgnoreCase("JOAO@example.com");
        assertThat(exists).isTrue();
    }
}
