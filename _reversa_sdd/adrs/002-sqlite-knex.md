# ADR-002: SQLite via Knex.js como banco de dados local

> Classificado pelo reversa-detective em 2026-05-02 | `doc_level: detalhado`
> Evidência: `electron/database.js`, `knexfile.js`, commit `39b6e2a refactor: adiciona estrutura de migration do knexjs`

---

## Status

**Adotado** — refatorado para Knex.js em versão intermediária

## Contexto

A aplicação precisa de persistência local de dados financeiros com capacidade de schema evolution (migrations) e sem dependência de servidor externo.

## Decisão

Usar **SQLite** via `better-sqlite3` com **Knex.js** como query builder e gerenciador de migrations.

## Alternativas Consideradas

🟡 INFERIDO

- **SQLite com driver puro:** descartado após refatoração — sem migrations estruturadas
- **IndexedDB/LocalStorage:** descartado — capacidade limitada para dados financeiros estruturados
- **LowDB/Nedb (JSON-based):** 🔴 LACUNA — não há evidência de consideração

## Consequências

- **Positivo:** Migrations versionadas garantem evolução controlada do schema
- **Positivo:** Query builder tipado evita SQL raw na maioria dos casos
- **Positivo:** Banco persiste em `userData/Database/finapp.db` — sobrevive a atualizações do app
- **Negativo:** `better-sqlite3` é síncrono mas exposto como assíncrono — pode confundir
- **Negativo:** Precisou de refatoração posterior (commit `39b6e2a`) — schema inicial não estava em migrations
- **Negativo:** Dois formatos de data coexistem por não terem sido normalizados na migração (fix `6ec7f53`)
