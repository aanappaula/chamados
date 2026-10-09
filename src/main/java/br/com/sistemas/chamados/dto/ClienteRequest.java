package br.com.sistemas.chamados.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClienteRequest(
    @NotBlank(message = "O nome é obrigatório")
    @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres")
    String nome,

    @NotBlank(message = "O email é obrigatório")
    @Email(message = "O email deve ser válido")
    String email,

    @Size(max = 20, message = "O telefone deve ter no máximo 20 caracteres")
    String telefone
) {}
