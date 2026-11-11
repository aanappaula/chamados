package br.com.sistemas.chamados.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Comentario;
import br.com.sistemas.chamados.entity.Perfil;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.entity.Tecnico;

import jakarta.persistence.EntityManager;

@DataJpaTest
class ChamadoRepositoryTest {

    @Autowired
    private ChamadoRepository chamadoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private TecnicoRepository tecnicoRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persisteChamadoComRelacionamentosEDefineAberturaAutomaticamente() {
        Cliente cliente = clienteRepository.save(new Cliente("Ana", "ana@example.com", "47999990000"));
        Categoria categoria = categoriaRepository.save(new Categoria("Infra", "Infraestrutura"));
        Tecnico tecnico = tecnicoRepository.save(new Tecnico("João", "joao@example.com", Perfil.TECNICO));
        Chamado chamado = chamadoRepository.saveAndFlush(
                new Chamado("Computador sem rede", "Falha de conexão", Prioridade.ALTA, cliente, categoria, tecnico));

        Long chamadoId = chamado.getId();
        entityManager.clear();

        Chamado carregado = chamadoRepository.findById(chamadoId).orElseThrow();

        assertThat(carregado.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(carregado.getDataAbertura()).isNotNull();
        assertThat(carregado.getDataFechamento()).isNull();
        assertThat(carregado.getCliente().getId()).isEqualTo(cliente.getId());
        assertThat(carregado.getCategoria().getId()).isEqualTo(categoria.getId());
        assertThat(carregado.getTecnico().getId()).isEqualTo(tecnico.getId());
    }

    @Test
    void persisteChamadoSemTecnicoAtribuido() {
        Cliente cliente = clienteRepository.save(new Cliente("Ana", "ana2@example.com", "47999990000"));
        Categoria categoria = categoriaRepository.save(new Categoria("Software", "Aplicações"));

        Chamado chamado = chamadoRepository.saveAndFlush(
                new Chamado("Aplicação indisponível", null, Prioridade.MEDIA, cliente, categoria, null));

        assertThat(chamado.getTecnico()).isNull();
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(chamado.getDataAbertura()).isNotNull();
    }

    @Test
    void persisteComentarioAssociadoAoChamadoComDataAutomatica() {
        Cliente cliente = clienteRepository.save(new Cliente("Ana", "ana3@example.com", "47999990000"));
        Categoria categoria = categoriaRepository.save(new Categoria("Rede", "Rede interna"));
        Chamado chamado = chamadoRepository.saveAndFlush(
                new Chamado("Sem conexão", null, Prioridade.ALTA, cliente, categoria, null));
        chamado.adicionarComentario(new Comentario("Estamos verificando.", "Ana Souza"));
        chamadoRepository.saveAndFlush(chamado);

        Long chamadoId = chamado.getId();
        entityManager.clear();

        Chamado carregado = chamadoRepository.findById(chamadoId).orElseThrow();

        assertThat(carregado.getComentarios()).hasSize(1);
        assertThat(carregado.getComentarios().get(0).getTexto()).isEqualTo("Estamos verificando.");
        assertThat(carregado.getComentarios().get(0).getAutor()).isEqualTo("Ana Souza");
        assertThat(carregado.getComentarios().get(0).getData()).isNotNull();
    }
}
