# Sistema de Gerenciamento de Chamados

Projeto acadêmico para desenvolvimento de uma API REST de gerenciamento de chamados de suporte. A implementação está sendo construída por etapas, aplicando a arquitetura em camadas e os padrões praticados na disciplina.

## Informações acadêmicas

- **Aluna:** Ana Paula de Souza
- **Disciplina:** Design e Arquitetura de Software I (DAS_I) — 144-6CN (2026-2)
- **Professor:** William Sestito

## Tecnologias

- Java 21
- Spring Boot 4.1.1
- Spring Web MVC
- Spring Data JPA
- Bean Validation
- Maven Wrapper
- H2 Database

## Funcionalidades disponíveis

Atualmente, a API possui operações de cadastro, consulta, atualização e exclusão para:

- **Clientes:** nome, e-mail e telefone.
- **Categorias:** nome e descrição, com validação e prevenção de nomes duplicados sem diferenciar maiúsculas de minúsculas.
- **Técnicos:** nome, e-mail e perfil (`ADMIN` ou `TECNICO`), com validação e prevenção de e-mails duplicados.

O projeto está sendo desenvolvido incrementalmente. Recursos do núcleo de chamados, como atribuição de técnico, transições de status, filtros, paginação e comentários, não estão incluídos nesta versão documentada.

## Executar localmente

É necessário ter o JDK 21 instalado. Na raiz do repositório, inicie a aplicação com o Maven Wrapper:

```powershell
.\mvnw.cmd spring-boot:run
```

No Windows Command Prompt, também é possível executar:

```cmd
mvnw.cmd spring-boot:run
```

Por padrão, a API fica disponível em `http://localhost:8080`. Para interromper a aplicação, pressione `Ctrl+C` no terminal em que ela está rodando.

## Executar os testes

No PowerShell:

```powershell
.\mvnw.cmd test
```

No Windows Command Prompt:

```cmd
mvnw.cmd test
```

## Endpoints

Todos os recursos abaixo oferecem as operações indicadas:

| Recurso | Criar | Listar | Consultar por ID | Atualizar | Excluir |
|---|---|---|---|---|---|
| Clientes | `POST /clientes` | `GET /clientes` | `GET /clientes/{id}` | `PUT /clientes/{id}` | `DELETE /clientes/{id}` |
| Categorias | `POST /categorias` | `GET /categorias` | `GET /categorias/{id}` | `PUT /categorias/{id}` | `DELETE /categorias/{id}` |
| Técnicos | `POST /tecnicos` | `GET /tecnicos` | `GET /tecnicos/{id}` | `PUT /tecnicos/{id}` | `DELETE /tecnicos/{id}` |

As operações `POST` e `PUT` recebem JSON e devem ser enviadas com o cabeçalho `Content-Type: application/json`.

### Exemplos de criação

`POST /clientes`:

```json
{
  "nome": "Ana Souza",
  "email": "ana@example.com",
  "telefone": "47999990000"
}
```

`POST /categorias`:

```json
{
  "nome": "Infraestrutura",
  "descricao": "Problemas relacionados à infraestrutura"
}
```

`POST /tecnicos`:

```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "perfil": "TECNICO"
}
```

Os valores permitidos para `perfil` são `ADMIN` e `TECNICO`.

## Banco de dados H2

O projeto utiliza o H2 em memória durante a execução local. Os dados são temporários e podem ser perdidos quando a aplicação for encerrada.

O console H2 está habilitado em `http://localhost:8080/h2-console`. As credenciais e a URL JDBC podem ser conferidas na configuração da aplicação e no log de inicialização do Spring Boot.
