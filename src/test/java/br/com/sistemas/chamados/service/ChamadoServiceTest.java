package br.com.sistemas.chamados.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ComentarioRequest;
import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Comentario;
import br.com.sistemas.chamados.entity.Perfil;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.CategoriaRepository;
import br.com.sistemas.chamados.repository.ChamadoRepository;
import br.com.sistemas.chamados.repository.ClienteRepository;
import br.com.sistemas.chamados.repository.ComentarioRepository;
import br.com.sistemas.chamados.repository.TecnicoRepository;

@SpringBootTest
@Transactional
class ChamadoServiceTest {

    @Autowired
    private ChamadoService service;

    @Autowired
    private ChamadoRepository chamadoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private TecnicoRepository tecnicoRepository;

    @Autowired
    private ComentarioRepository comentarioRepository;

    private Cliente cliente;
    private Categoria categoria;
    private Tecnico tecnico;

    @BeforeEach
    void prepararDados() {
        cliente = clienteRepository.save(new Cliente("Ana", "ana@test.com", "47999990000"));
        categoria = categoriaRepository.save(new Categoria("Infra", "Infraestrutura"));
        tecnico = tecnicoRepository.save(new Tecnico("João", "joao@test.com", Perfil.TECNICO));
    }

    @Test
    void fecharChamadoDefineDataFechamento() {
        var criado = service.criar(novoChamado(null));

        var fechado = service.alterarStatus(criado.id(), StatusChamado.FECHADO);

        assertThat(fechado.status()).isEqualTo(StatusChamado.FECHADO);
        assertThat(fechado.dataFechamento()).isNotNull();
    }

    @Test
    void permiteTransicoesAntesDoFechamento() {
        var criado = service.criar(novoChamado(null));

        var emAtendimento = service.alterarStatus(criado.id(), StatusChamado.EM_ATENDIMENTO);
        var aguardandoCliente = service.alterarStatus(criado.id(), StatusChamado.AGUARDANDO_CLIENTE);

        assertThat(emAtendimento.status()).isEqualTo(StatusChamado.EM_ATENDIMENTO);
        assertThat(aguardandoCliente.status()).isEqualTo(StatusChamado.AGUARDANDO_CLIENTE);
    }

    @Test
    void bloqueiaAtribuicaoEAtualizacaoDepoisDeFechado() {
        var criado = service.criar(novoChamado(null));
        service.alterarStatus(criado.id(), StatusChamado.FECHADO);

        assertThatThrownBy(() -> service.atribuirTecnico(criado.id(), tecnico.getId()))
                .isInstanceOf(RegraNegocioException.class);
        assertThatThrownBy(() -> service.atualizar(criado.id(), novoChamado(tecnico.getId())))
                .isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void rejeitaAlteracaoDeStatusDepoisDeFechado() {
        var criado = service.criar(novoChamado(null));
        service.alterarStatus(criado.id(), StatusChamado.FECHADO);

        assertThatThrownBy(() -> service.alterarStatus(criado.id(), StatusChamado.ABERTO))
                .isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void atribuiTecnicoAoChamadoAberto() {
        var criado = service.criar(novoChamado(null));

        var atribuido = service.atribuirTecnico(criado.id(), tecnico.getId());

        assertThat(atribuido.tecnicoId()).isEqualTo(tecnico.getId());
    }

    @Test
    void filtrosCombinadosRetornamPaginaOrdenada() {
        var primeiro = service.criar(novoChamado(null));
        var segundo = service.criar(novoChamado(null));
        service.alterarStatus(segundo.id(), StatusChamado.EM_ATENDIMENTO);

        var pagina = service.listar(
                StatusChamado.ABERTO,
                Prioridade.ALTA,
                cliente.getId(),
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "dataAbertura")));

        assertThat(pagina.getTotalElements()).isEqualTo(1);
        assertThat(pagina.getContent()).extracting("id").containsExactly(primeiro.id());
    }

    @Test
    void listarPorClienteRetornaNotFoundQuandoClienteNaoExiste() {
        assertThatThrownBy(() -> service.listarPorCliente(999999L, PageRequest.of(0, 10)))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void adicionarComentarioRegistraAutorDataEIncluiComentarioNoDetalhe() {
        var criado = service.criar(novoChamado(null));

        var comentario = service.adicionarComentario(
                criado.id(),
                new ComentarioRequest("Estamos verificando.", "Ana Souza"));
        var detalhe = service.buscar(criado.id());

        assertThat(comentario.id()).isNotNull();
        assertThat(comentario.data()).isNotNull();
        assertThat(comentario.autor()).isEqualTo("Ana Souza");
        assertThat(detalhe.comentarios()).hasSize(1);
        assertThat(detalhe.comentarios().get(0).texto()).isEqualTo("Estamos verificando.");
    }

    @Test
    void adicionarComentarioRetornaNotFoundQuandoChamadoNaoExiste() {
        assertThatThrownBy(() -> service.adicionarComentario(
                999999L,
                new ComentarioRequest("Comentário", "Ana Souza")))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    @Test
    void comentarioRepositoryDisponibilizaPersistenciaDoComentario() {
        var criado = service.criar(novoChamado(null));
        Comentario comentario = new Comentario("Análise iniciada.", "João");
        comentario.setChamado(chamadoRepository.findById(criado.id()).orElseThrow());
        comentarioRepository.saveAndFlush(comentario);

        assertThat(comentarioRepository.findById(comentario.getId())).isPresent();
    }

    private ChamadoRequest novoChamado(Long tecnicoId) {
        return new ChamadoRequest(
                "Chamado de teste",
                "Descrição de teste",
                Prioridade.ALTA,
                cliente.getId(),
                categoria.getId(),
                tecnicoId);
    }
}
