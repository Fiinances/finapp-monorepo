# Reconstruction Plan — Finapp Mobile (Quarkus + Supabase)

**Stack:** 
- **Mobile:** React Native + NativeWind (Tailwind CSS) + Gluestack UI
- **API:** Java Quarkus (REST)
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel (Backend) + Supabase (DB/Auth)
**Gerado em:** 2026-05-03
**Status:** 22 tarefas | 8 concluídas | 14 pendentes

---

## Alertas de pré-voo

> Pontos críticos para a nova arquitetura mobile/cloud.

- ⚠️ **Configuração Vercel + Quarkus** — Requer o uso de Vercel Runtimes para Java ou containerização específica. Devemos validar o entry point da função serverless.
- ⚠️ **Temas Light/Dark** — Implementar via NativeWind (dark class) e garantir que o Java Quarkus não precise de conhecimento sobre o tema (lógica puramente no frontend).
- ⚠️ **G-03: Seeding de categorias** — Deve ser feito via SQL no Supabase (seed.sql).
- ⚠️ **Autenticação** — Integração Supabase Auth no React Native.

---

## Tarefas

### Fase 1: Infraestrutura e Dados (Supabase)

#### Tarefa 01 — Schema no Supabase (PostgreSQL)
**Status:** ✅ done
**Lê:** `_reversa_sdd/erd-complete.md`, `_reversa_sdd/data-dictionary.md`
**Constrói:** Scripts SQL (DDL) para o Supabase
**Pronto quando:** Tabelas criadas no Postgres com RLS (Row Level Security) habilitado por `user_id`.

#### Tarefa 02 — Seeding e Categorias Base
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/categories.md` §10
**Constrói:** `seed.sql`
**Pronto quando:** Categorias padrão inseridas no banco de dados.

---

### Fase 2: Backend (Java Quarkus)

#### Tarefa 03 — Setup do Projeto Quarkus
**Status:** ✅ done
**Constrói:** Estrutura Maven, extensões (Resteasy Reactive, Hibernate Panache, JDBC Postgres, **Flyway**)
**Inclui obrigatoriamente:**
- Flyway configurado como extensão Quarkus (`quarkus-flyway`)
- Migration inicial `V1__finapp_initial_schema.sql` com o schema completo (tabelas + índices + triggers + RLS) já aplicado no Supabase nas Tarefas 01 e 02
- Migration `V2__seed_categories.sql` com a função de seeding e trigger de Auth
**Pronto quando:** Projeto compila, conecta ao Supabase e Flyway valida que as migrations V1 e V2 estão aplicadas (baseline).

#### Tarefa 04 — Entidades e Repositórios (JPA)
**Status:** ✅ done
**Lê:** `_reversa_sdd/domain.md`, `_reversa_sdd/data-dictionary.md`
**Constrói:** Classes `@Entity` Java e Repositórios Panache
**Pronto quando:** Mapeamento objeto-relacional completo para todas as entidades financeiras.

#### Tarefa 05 — API: Transactions & Categories
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/transactions.md`, `_reversa_sdd/sdd/categories.md`
**Constrói:** `@Path("/transactions")`, `@Path("/categories")`
**Pronto quando:** Endpoints de CRUD e listagem funcional.

#### Tarefa 06 — API: Banks & Cards
**Status:** ✅ done
**Lê:** `_reversa_sdd/sdd/banks.md`
**Constrói:** Endpoints para gestão de contas e cartões
**Pronto quando:** API permite criar e editar bancos/cartões conforme as RNs.

#### Tarefa 07 — Lógica de Negócio: Detecção de Padrões
**Status:** done
**Lê:** `_reversa_sdd/sdd/ipc-db.md` (Algoritmos de detecção)
**Constrói:** Serviços Java para detecção de parcelamentos e assinaturas
**Pronto quando:** Algoritmos originais portados para Java/Postgres.

#### Tarefa 08 — API: Installments & Subscriptions
**Status:** done
**Lê:** `_reversa_sdd/sdd/installments.md`, `_reversa_sdd/sdd/subscriptions.md`
**Constrói:** Endpoints de gestão de parcelas e recorrências
**Pronto quando:** Funcionalidades de progresso e ativação/desativação disponíveis via REST.

#### Tarefa 09 — API: Dashboard Analytics
**Status:** pending
**Lê:** `_reversa_sdd/sdd/dashboard.md`
**Constrói:** Endpoints de agregação
**Pronto quando:** API retorna dados agregados para o Dashboard mobile.

#### Tarefa 10 — Testes Automatizados: Backend
**Status:** pending
**Lê:** `_reversa_sdd/sdd/transactions.md`, `_reversa_sdd/sdd/banks.md`, `_reversa_sdd/sdd/installments.md`, `_reversa_sdd/sdd/subscriptions.md`
**Constrói:** Suite JUnit 5 com `@QuarkusTest` + REST-assured para todos os endpoints REST; `@TestSecurity` para simular usuários autenticados; cobertura de cenários de sucesso, 404 e validação (422)
**Pronto quando:** Testes cobrem os endpoints de Transactions, Accounts, Cards, Categories, Installments e Subscriptions com no mínimo 80% de cobertura dos branches críticos; todos os testes passam em CI.

#### Tarefa 11 — Deploy Vercel (Quarkus)
**Status:** pending
**Constrói:** `vercel.json`, build scripts
**Pronto quando:** API acessível via URL de produção da Vercel.

---

### Fase 3: Frontend Mobile (React Native)

#### Tarefa 12 — Setup React Native, UI Lib & Themes
**Status:** pending
**Constrói:** Expo/CLI, **NativeWind**, **Gluestack UI**, Configuração de Temas Light/Dark
**Pronto quando:** App inicia com suporte a temas e componentes básicos da UI Lib.

#### Tarefa 13 — Integração Supabase Auth
**Status:** pending
**Constrói:** Telas de Login/Cadastro, Auth Provider
**Pronto quando:** Usuário consegue se logar e manter a sessão no app.

#### Tarefa 14 — Componentes Core: Listagem de Transações
**Status:** pending
**Lê:** `_reversa_sdd/sdd/transactions.md`, `_reversa_sdd/sdd/categories.md`
**Constrói:** FlatList com NativeWind + Gluestack
**Pronto quando:** Transações renderizadas com suporte a Dark Mode.

#### Tarefa 15 — Tela: Dashboard (Gráficos Mobile)
**Status:** pending
**Lê:** `_reversa_sdd/sdd/dashboard.md`
**Constrói:** Integração com gráficos mobile
**Pronto quando:** Gráficos adaptados para visualização mobile e temas.

#### Tarefa 16 — Tela: Gestão de Bancos e Cartões
**Status:** pending
**Lê:** `_reversa_sdd/sdd/banks.md`
**Constrói:** CRUD Mobile (Forms com validação)
**Pronto quando:** Usuário gerencia contas e cartões pelo app.

#### Tarefa 17 — Tela: Gestão de Parcelamentos e Assinaturas
**Status:** pending
**Lê:** `_reversa_sdd/sdd/installments.md`, `_reversa_sdd/sdd/subscriptions.md`
**Constrói:** Telas de detalhe e detecção automática
**Pronto quando:** Fluxos de detecção portados para a UI mobile.

#### Tarefa 18 — Fluxo de Importação (Mobile)
**Status:** pending
**Lê:** `_reversa_sdd/sdd/import.md`
**Constrói:** Upload de arquivos + Preview de importação
**Pronto quando:** Usuário importa OFX/CSV via celular.

---

### Fase 4: Testes e Validação E2E

#### Tarefa 19 — Testes Automatizados: Frontend
**Status:** pending
**Lê:** `_reversa_sdd/user-stories/`
**Constrói:** Testes unitários com Jest + React Native Testing Library (RNTL) para componentes core; hooks de API mockados com Jest; cobertura de estados de loading, erro e sucesso; testes de snapshot para componentes visuais
**Pronto quando:** Componentes de Listagem de Transações, Dashboard e Auth cobertos por testes unitários; snapshots aprovados; todos os testes passam em CI.

#### Tarefa 20 — Validação E2E (Maestro)
**Status:** pending
**Lê:** Todas as User Stories em `_reversa_sdd/user-stories/`
**Constrói:** Fluxos Maestro (`.yaml`) cobrindo os cenários críticos de cada User Story — login, importação, categorização, dashboard
**Pronto quando:** Fluxos E2E executados com sucesso no emulador (iOS e Android) sem erros; todos os critérios de aceitação das User Stories validados.

#### Tarefa 21 — Integração LLM (Groq)
**Status:** pending
**Lê:** `_reversa_sdd/sdd/ipc-llm.md`
**Constrói:** Chamada do Quarkus para a Groq API
**Pronto quando:** Auto-categorização funcional via backend.

#### Tarefa 22 — Polimento de UI/UX (Poppins & Themes)
**Status:** pending
**Lê:** `_reversa_sdd/design-system/`
**Constrói:** Ajustes finais de design, fonte Poppins e contraste nos temas
**Pronto quando:** App visualmente premium em Light e Dark mode.
