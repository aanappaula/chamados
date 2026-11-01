# Sistema de Gerenciamento de Chamados

Projeto acadêmico para desenvolvimento incremental de uma API REST de gerenciamento de chamados de suporte, aplicando arquitetura em camadas e os padrões praticados na disciplina.

## Informações acadêmicas

- **Aluna:** Ana Paula de Souza
- **Matéria:** Disco VirtualAluno
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
- **Chamados:** título, descrição, datas de abertura/fechamento, prioridade, status e relacionamentos com cliente, categoria e técnico. O status inicial (`ABERTO`) e a data de abertura são definidos automaticamente.

Esta etapa contempla apenas o CRUD base de Chamados. Rotas para atribuição e alteração de status, filtros, paginação, comentários e histórico serão implementados em etapas posteriores.

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

Os testes de persistência de Chamados utilizam H2 e verificam os relacionamentos com Cliente, Categoria e Técnico, além dos valores iniciais de status e data de abertura.

## Endpoints

Todos os recursos abaixo oferecem as operações indicadas:

| Recurso | Criar | Listar | Consultar por ID | Atualizar | Excluir |
|---|---|---|---|---|---|
| Clientes | `POST /clientes` | `GET /clientes` | `GET /clientes/{id}` | `PUT /clientes/{id}` | `DELETE /clientes/{id}` |
| Categorias | `POST /categorias` | `GET /categorias` | `GET /categorias/{id}` | `PUT /categorias/{id}` | `DELETE /categorias/{id}` |
| Técnicos | `POST /tecnicos` | `GET /tecnicos` | `GET /tecnicos/{id}` | `PUT /tecnicos/{id}` | `DELETE /tecnicos/{id}` |
| Chamados | `POST /chamados` | `GET /chamados` | `GET /chamados/{id}` | `PUT /chamados/{id}` | `DELETE /chamados/{id}` |

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

`POST /chamados`:

```json
{
  "titulo": "Computador sem acesso à rede",
  "descricao": "O equipamento não consegue se conectar à rede interna.",
  "prioridade": "ALTA",
  "clienteId": 1,
  "categoriaId": 1
}
```

Os valores permitidos para `prioridade` são `BAIXA`, `MEDIA`, `ALTA` e `CRITICA`. `tecnicoId` é opcional no cadastro; cliente e categoria precisam existir. Status e data de abertura são preenchidos pelo sistema.

## Banco de dados H2

O projeto utiliza o H2 em memória durante a execução local. Os dados são temporários e podem ser perdidos quando a aplicação for encerrada.

O console H2 está habilitado em `http://localhost:8080/h2-console`. As credenciais e a URL JDBC podem ser conferidas na configuração da aplicação e no log de inicialização do Spring Boot.
