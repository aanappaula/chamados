package br.com.sistemas.chamados.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComentarioRequest(
    @NotBlank(message = "O texto do comentário é obrigatório")
    @Size(max = 2000, message = "O comentário deve ter no máximo 2000 caracteres")
    String texto,

    @NotBlank(message = "O autor do comentário é obrigatório")
    @Size(max = 120, message = "O nome do autor deve ter no máximo 120 caracteres")
    String autor
) {
}
