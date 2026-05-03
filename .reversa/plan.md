# Plano de Exploração — electron-next-app

> Criado pelo Reversa em 2026-05-02
> Marque cada tarefa com ✅ quando concluída.
> Você pode editar este plano antes de iniciar: adicione, remova ou reordene tarefas conforme necessário.

---

## Fase 1: Reconhecimento 🔍 ✅

- [x] **Scout** — Mapeamento de estrutura de pastas e tecnologias ✅
- [x] **Scout** — Análise de dependências e gerenciadores de pacotes ✅
- [x] **Scout** — Identificação de entry points, CI/CD e configurações ✅

## Fase 2: Escavação 🏗️ ✅

- [x] **Arqueólogo** — Análise do módulo `transactions` (core financeiro) ✅
- [x] **Arqueólogo** — Análise do módulo `dashboard` ✅
- [x] **Arqueólogo** — Análise do módulo `banks` (contas + cartões) ✅
- [x] **Arqueólogo** — Análise do módulo `installments` ✅
- [x] **Arqueólogo** — Análise do módulo `subscriptions` ✅
- [x] **Arqueólogo** — Análise do módulo `categories` ✅
- [x] **Arqueólogo** — Análise do módulo `electron-main` (processo principal) ✅
- [x] **Arqueólogo** — Análise do módulo `ipc-db` (handlers IPC/SQLite) ✅
- [x] **Arqueólogo** — Análise do módulo `ipc-llm` + `llm` (integração LLM) ✅
- [x] **Arqueólogo** — Análise do módulo `import` (OFX/CSV) ✅

## Fase 3: Interpretação 🧠 ✅

- [x] **Detetive** — Arqueologia Git e ADRs retroativos ✅
- [x] **Detetive** — Regras de negócio implícitas e máquinas de estado ✅
- [x] **Detetive** — Matriz de permissões (RBAC/ACL) ✅
- [x] **Arquiteto** — Diagramas C4 (Contexto, Containers, Componentes) ✅
- [x] **Arquiteto** — ERD completo e integrações externas ✅
- [x] **Arquiteto** — Spec Impact Matrix ✅

## Fase 4: Geração 📝 ✅

- [x] **Redator** — Specs SDD por componente ✅
- [x] **Redator** — OpenAPI (se aplicável) ✅
- [x] **Redator** — User Stories (se aplicável) ✅
- [x] **Redator** — Code/Spec Matrix ✅

## Fase 5: Revisão ✅ ✅

- [x] **Revisor** — Revisão cruzada de specs ✅
- [x] **Revisor** — Resolução de lacunas com o usuário ✅
- [x] **Revisor** — Relatório de confiança final ✅

---

## Agentes Independentes

> Execute estes agentes quando os recursos estiverem disponíveis — podem rodar em qualquer fase.

- [ ] **Visor** — Análise de interface via screenshots
- [ ] **Data Master** — Análise completa do banco de dados
- [x] **Design System** — Extração de tokens de design ✅
- [ ] **Tracer** — Análise dinâmica (requer sistema acessível)
