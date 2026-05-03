# Finapp Backend — Java Quarkus

API REST do **Finapp** — Controle Financeiro Pessoal.

**Stack:** Java 21 + Quarkus 3.10 + PostgreSQL (Supabase) + Flyway + JWT (Supabase Auth)

---

## Pré-requisitos

- Java 21+
- Maven 3.9+
- Acesso ao projeto Supabase (connection string)

---

## Configuração

1. Copie o template de configuração:
   ```bash
   cp src/main/resources/application.properties.template src/main/resources/application.properties
   ```

2. Preencha as variáveis em `application.properties`:
   - `quarkus.datasource.jdbc.url` — connection string do Supabase
   - `quarkus.datasource.password` — senha do banco
   - `mp.jwt.verify.issuer` — URL do Supabase Auth
   - `mp.jwt.verify.publickey.location` — JWKS do Supabase

---

## Executar em desenvolvimento

```bash
./mvnw quarkus:dev
```

A API estará disponível em `http://localhost:8080`.

Swagger UI: `http://localhost:8080/swagger`  
Health check: `http://localhost:8080/q/health`

---

## Migrations (Flyway)

As migrations ficam em `src/main/resources/db/migration/`:

| Arquivo | Descrição |
|---|---|
| `V1__finapp_initial_schema.sql` | Schema completo (tabelas, índices, RLS, triggers) |
| `V2__seed_categories.sql` | Categorias padrão + trigger de Auth |

O Flyway executa as migrations automaticamente ao iniciar (`migrate-at-start=true`).

> **Nota:** V1 e V2 já foram aplicadas manualmente ao Supabase durante o bootstrap.
> O Flyway está configurado com `baseline-on-migrate=true` e `baseline-version=2`
> para reconhecê-las como já aplicadas sem re-executar.

Para criar uma nova migration:
```
src/main/resources/db/migration/V3__nome_descritivo.sql
```

---

## Build para produção

```bash
./mvnw package
java -jar target/quarkus-app/quarkus-run.jar
```

## Build nativo (GraalVM)

```bash
./mvnw package -Pnative
```

---

## Estrutura do projeto

```
backend/
├── pom.xml
└── src/
    └── main/
        ├── java/br/com/finapp/
        │   ├── FinappResource.java          # Health check raiz
        │   ├── security/
        │   │   └── SecurityService.java     # Extração de user_id do JWT
        │   ├── exception/
        │   │   └── GlobalExceptionMapper.java
        │   ├── domain/                      # Entidades JPA (Tarefa 04)
        │   ├── repository/                  # Repositórios Panache (Tarefa 04)
        │   ├── service/                     # Serviços de negócio (Tarefas 05-09)
        │   └── resource/                    # Controllers REST (Tarefas 05-09)
        └── resources/
            ├── application.properties       # ⚠️ NÃO commitar (contém secrets)
            ├── application.properties.template
            └── db/migration/
                ├── V1__finapp_initial_schema.sql
                └── V2__seed_categories.sql
```
