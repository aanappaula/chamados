package br.com.sistemas.chamados.service;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.sistemas.chamados.dto.TecnicoRequest;
import br.com.sistemas.chamados.dto.TecnicoResponse;
import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.TecnicoRepository;

@Service
public class TecnicoService {

    private final TecnicoRepository repository;

    public TecnicoService(TecnicoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public TecnicoResponse criar(TecnicoRequest dto) {
        String email = normalizarEmail(dto.email());
        if (repository.existsByEmailIgnoreCase(email)) {
            throw new RegraNegocioException("Já existe um tecnico com este e-mail: " + dto.email());
        }
        Tecnico salvo = repository.save(new Tecnico(dto.nome(), email, dto.perfil()));
        return TecnicoResponse.de(salvo);
    }

    @Transactional(readOnly = true)
    public List<TecnicoResponse> listar() {
        return repository.findAll().stream().map(TecnicoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public TecnicoResponse buscar(Long id) {
        return TecnicoResponse.de(buscarEntity(id));
    }

    @Transactional
    public TecnicoResponse atualizar(Long id, TecnicoRequest dto) {
        Tecnico t = buscarEntity(id);
        String email = normalizarEmail(dto.email());
        if (repository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new RegraNegocioException("Já existe um tecnico com este e-mail: " + dto.email());
        }
        t.setNome(dto.nome());
        t.setEmail(email);
        t.setPerfil(dto.perfil());
        return TecnicoResponse.de(t);
    }

    @Transactional
    public void excluir(Long id) {
        repository.delete(buscarEntity(id));
    }

    private Tecnico buscarEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Tecnico " + id + " não encontrado"));
    }

    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
