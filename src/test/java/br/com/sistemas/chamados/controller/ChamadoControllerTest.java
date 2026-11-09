package br.com.sistemas.chamados.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.ComentarioResponse;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.exception.GlobalExceptionHandler;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.service.ChamadoService;

@WebMvcTest(ChamadoController.class)
@Import(GlobalExceptionHandler.class)
class ChamadoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChamadoService service;

    @Test
    void postValidoCriaChamado() throws Exception {
        when(service.criar(any())).thenReturn(chamadoResponse());

        mockMvc.perform(post("/chamados")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "titulo": "Computador sem rede",
                          "descricao": "Falha na conexão",
                          "prioridade": "ALTA",
                          "clienteId": 1,
                          "categoriaId": 2
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/chamados/1"))
                .andExpect(jsonPath("$.status").value("ABERTO"))
                .andExpect(jsonPath("$.clienteId").value(1))
                .andExpect(jsonPath("$.categoriaId").value(2));
    }

    @Test
    void postInvalidoRetornaBadRequest() throws Exception {
        mockMvc.perform(post("/chamados")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "titulo": "",
                          "prioridade": "ALTA",
                          "clienteId": 1,
                          "categoriaId": 2
                        }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detalhes").isArray());
    }

    @Test
    void postComRegraDeNegocioVioladaRetornaConflict() throws Exception {
        when(service.criar(any())).thenThrow(new RegraNegocioException("Regra de negócio violada"));

        mockMvc.perform(post("/chamados")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "titulo": "Computador sem rede",
                          "prioridade": "ALTA",
                          "clienteId": 1,
                          "categoriaId": 2
                        }
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void getChamadoInexistenteRetornaNotFound() throws Exception {
        when(service.buscar(404L)).thenThrow(new RecursoNaoEncontradoException("Chamado 404 não encontrado"));

        mockMvc.perform(get("/chamados/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void getListaAceitaFiltrosPaginacaoEOrdenacao() throws Exception {
        when(service.listar(
                eq(StatusChamado.ABERTO),
                eq(Prioridade.ALTA),
                eq(1L),
                any())).thenReturn(new PageImpl<>(List.of(chamadoResponse()), PageRequest.of(0, 5), 1));

        mockMvc.perform(get("/chamados")
                .param("status", "ABERTO")
                .param("prioridade", "ALTA")
                .param("clienteId", "1")
                .param("page", "0")
                .param("size", "5")
                .param("sort", "dataAbertura,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.size").value(5));

        verify(service).listar(eq(StatusChamado.ABERTO), eq(Prioridade.ALTA), eq(1L), any());
    }

    @Test
    void patchStatusFechadoRetornaConflict() throws Exception {
        when(service.alterarStatus(eq(1L), eq(StatusChamado.ABERTO)))
                .thenThrow(new RegraNegocioException("Chamado fechado não pode ser alterado"));

        mockMvc.perform(patch("/chamados/1/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"status": "ABERTO"}
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void patchAtribuirTecnicoRetornaChamadoAtualizado() throws Exception {
        when(service.atribuirTecnico(1L, 7L)).thenReturn(chamadoResponse());

        mockMvc.perform(patch("/chamados/1/atribuir")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"tecnicoId": 7}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void postComentarioRetornaCreated() throws Exception {
        when(service.adicionarComentario(eq(1L), any()))
                .thenReturn(new ComentarioResponse(3L, "Em análise.", LocalDateTime.now(), "Ana Souza"));

        mockMvc.perform(post("/chamados/1/comentarios")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"texto": "Em análise.", "autor": "Ana Souza"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/chamados/1/comentarios/3"))
                .andExpect(jsonPath("$.texto").value("Em análise."))
                .andExpect(jsonPath("$.autor").value("Ana Souza"));
    }

    @Test
    void postComentarioSemAutorRetornaBadRequest() throws Exception {
        mockMvc.perform(post("/chamados/1/comentarios")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"texto": "Em análise.", "autor": ""}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private ChamadoResponse chamadoResponse() {
        return new ChamadoResponse(
                1L,
                "Computador sem rede",
                "Falha na conexão",
                LocalDateTime.now(),
                null,
                Prioridade.ALTA,
                StatusChamado.ABERTO,
                1L,
                2L,
                null,
                List.of());
    }
}
