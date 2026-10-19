package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.entity.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TecnicoRequest(
    @NotBlank(message = "O nome é obrigatório")
    @Size(max = 100)
    String nome,

    @NotBlank(message = "O email é obrigatório")
    @Email(message = "O email deve ser válido")
    @Size(max = 120, message = "O email deve ter no máximo 120 caracteres")
    String email,

    @NotNull(message = "O perfil é obrigatório")
    Perfil perfil
) {}
