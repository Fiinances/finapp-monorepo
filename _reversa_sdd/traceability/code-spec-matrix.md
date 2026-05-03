# Matriz de Rastreabilidade — Código ↔ Spec

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Cobertura: 10 SDDs · 5 conjuntos de User Stories · 15 User Stories · 16 arquivos de código

---

## Legenda

| Símbolo | Significado |
|---|---|
| 🟢 | Alta confiança — extraído diretamente do código |
| 🟡 | Média confiança — inferido por contexto |
| 🔴 | Baixa confiança / lacuna documentada |
| **SDD** | Software Design Document (spec de componente) |
| **US** | User Story |

---

## 1. Código → Spec (por arquivo)

### Processo Principal (Main Process)

| Arquivo | SDD | User Stories | Confiança |
|---|---|---|---|
| `electron/main.js` | [electron-main.md](../sdd/electron-main.md) | US-04 (Groq indiretamente) | 🟢 |
| `electron/preload.js` | [electron-main.md](../sdd/electron-main.md) §9 | Todas (bridge IPC) | 🟢 |
| `electron/database.js` | [ipc-db.md](../sdd/ipc-db.md) §10 | — | 🟢 |
| `electron/db-handlers.js` | [ipc-db.md](../sdd/ipc-db.md) | US-01, US-02, US-06, US-07, US-08, US-09, US-11 | 🟢 |
| `electron/llm-handlers.js` | [ipc-llm.md](../sdd/ipc-llm.md) §4 | US-04 | 🟢 |

### Migrations

| Arquivo | SDD | Confiança |
|---|---|---|
| `electron/migrations/20260327180000_create_transaction_categories.js` | [categories.md](../sdd/categories.md) §4 | 🟢 |
| `electron/migrations/20260327190000_add_category_id_to_transactions.js` | [categories.md](../sdd/categories.md) §4 | 🟢 |
| `electron/migrations/20260327190010_add_category_id_to_subscriptions.js` | [categories.md](../sdd/categories.md) §4 | 🟢 |
| `electron/migrations/20260327190020_add_category_id_to_installment_groups.js` | [categories.md](../sdd/categories.md) §4 | 🟢 |
| `electron/migrations/20260327190021_populate_transaction_categories.js` | [categories.md](../sdd/categories.md) §10 | 🟢 |
| `electron/migrations/20260327192000_populate_and_link_transaction_categories.js` | [categories.md](../sdd/categories.md) §10 | 🟢 |

### Renderer — Biblioteca compartilhada (lib/)

| Arquivo | SDD | User Stories | Confiança |
|---|---|---|---|
| `lib/transactions.ts` | [transactions.md](../sdd/transactions.md) | US-12, US-13, US-14 (via buildSummaries) | 🟢 |
| `lib/llm-client.ts` | [ipc-llm.md](../sdd/ipc-llm.md) §5 | US-05 | 🟢 |
| `lib/llm-worker.ts` | [ipc-llm.md](../sdd/ipc-llm.md) §5.4 | US-05 | 🟢 |
| `lib/utils.ts` | [installments.md](../sdd/installments.md) §7 | US-06, US-07 | 🟢 |

### Renderer — Componentes (components/)

| Arquivo | SDD | User Stories | Confiança |
|---|---|---|---|
| `components/import-dropdown.tsx` | [import.md](../sdd/import.md) | US-01, US-02, US-03, US-04 | 🟢 |
| `components/transaction-table.tsx` | [categories.md](../sdd/categories.md) §6-7 | US-03 | 🟢 |
| `components/month-picker.tsx` | [import.md](../sdd/import.md) §8, [installments.md](../sdd/installments.md) §5.1 | US-01, US-06 | 🟡 |

### Renderer — Páginas (app/)

| Arquivo | SDD | User Stories | Confiança |
|---|---|---|---|
| `app/dashboard/page.tsx` | [dashboard.md](../sdd/dashboard.md) | US-12, US-13, US-14, US-15 | 🟢 |
| `app/dashboard/components/MonthlyIncomeExpenseChart.tsx` | [dashboard.md](../sdd/dashboard.md) §4.1 | US-12 | 🟢 |
| `app/dashboard/components/CategoryExpenseChart.tsx` | [dashboard.md](../sdd/dashboard.md) §4.2 | US-13 | 🟢 |
| `app/dashboard/components/CreditCardFaturaChart.tsx` | [dashboard.md](../sdd/dashboard.md) §4.3 | US-14 | 🟢 |
| `app/dashboard/components/AccountSubscriptionsCalendar.tsx` | [dashboard.md](../sdd/dashboard.md) §4.4 | US-15 | 🟢 |
| `app/banks/page.tsx` | [banks.md](../sdd/banks.md) | — | 🟢 |
| `app/banks/components/add-bank-sheet.tsx` | [banks.md](../sdd/banks.md) §5.1 | — | 🟡 |
| `app/banks/components/edit-bank-sheet.tsx` | [banks.md](../sdd/banks.md) §5.2 | — | 🟡 |
| `app/banks/components/add-credit-card-sheet.tsx` | [banks.md](../sdd/banks.md) §5.3 | — | 🟡 |
| `app/banks/components/edit-credit-card-sheet.tsx` | [banks.md](../sdd/banks.md) §5.4 | — | 🟡 |
| `app/installments/page.tsx` | [installments.md](../sdd/installments.md) | US-06, US-07, US-08 | 🟢 |
| `app/installments/components/detect-installments-sheet.tsx` | [installments.md](../sdd/installments.md) §6 | US-08 | 🟡 |
| `app/subscriptions/page.tsx` | [subscriptions.md](../sdd/subscriptions.md) | US-09, US-10, US-11 | 🟢 |
| `app/subscriptions/components/subscription-sheet.tsx` | [subscriptions.md](../sdd/subscriptions.md) §6 | US-09 | 🟡 |
| `app/subscriptions/components/detect-subscriptions-sheet.tsx` | [subscriptions.md](../sdd/subscriptions.md) §7 | US-11 | 🟡 |
| `app/features/categories/category.tsx` | [categories.md](../sdd/categories.md) §6 | — | 🟢 |
| `app/types/electron.d.ts` | [transactions.md](../sdd/transactions.md) §5, [ipc-db.md](../sdd/ipc-db.md) §4, [categories.md](../sdd/categories.md) §8 | Todas | 🟢 |

---

## 2. Spec → Código (por SDD)

| SDD | Arquivos de código mapeados | Cobertura |
|---|---|---|
| [ipc-db.md](../sdd/ipc-db.md) | `electron/db-handlers.js`, `electron/database.js`, `electron/preload.js` | 🟢 Alta |
| [transactions.md](../sdd/transactions.md) | `lib/transactions.ts`, `app/types/electron.d.ts` | 🟢 Alta |
| [import.md](../sdd/import.md) | `components/import-dropdown.tsx`, `components/month-picker.tsx` | 🟢 Alta |
| [ipc-llm.md](../sdd/ipc-llm.md) | `electron/llm-handlers.js`, `lib/llm-client.ts`, `lib/llm-worker.ts` | 🟢 Alta |
| [electron-main.md](../sdd/electron-main.md) | `electron/main.js`, `electron/preload.js` | 🟢 Alta |
| [dashboard.md](../sdd/dashboard.md) | `app/dashboard/page.tsx`, 4 componentes de gráfico | 🟢 Alta |
| [banks.md](../sdd/banks.md) | `app/banks/page.tsx`, 4 sheets de CRUD | 🟡 Média (sheets inferidas) |
| [installments.md](../sdd/installments.md) | `app/installments/page.tsx`, `detect-installments-sheet.tsx`, `lib/utils.ts` | 🟡 Média (detect inferida) |
| [subscriptions.md](../sdd/subscriptions.md) | `app/subscriptions/page.tsx`, 2 sheets | 🟡 Média (sheets inferidas) |
| [categories.md](../sdd/categories.md) | `app/features/categories/category.tsx`, `components/transaction-table.tsx`, 6 migrations | 🟢 Alta |

---

## 3. User Stories → Spec → Código

| US | Título | SDD referenciada | Código principal |
|---|---|---|---|
| US-01 | Importar extrato OFX | [import.md](../sdd/import.md), [ipc-db.md](../sdd/ipc-db.md) | `import-dropdown.tsx`, `db-handlers.js` |
| US-02 | Importar extrato CSV | [import.md](../sdd/import.md) | `import-dropdown.tsx` |
| US-03 | Revisar transações antes de importar | [import.md](../sdd/import.md), [categories.md](../sdd/categories.md) | `import-dropdown.tsx`, `transaction-table.tsx` |
| US-04 | Auto-categorizar via Groq | [ipc-llm.md](../sdd/ipc-llm.md), [import.md](../sdd/import.md) | `llm-handlers.js`, `import-dropdown.tsx` |
| US-05 | Usar LLM local (MediaPipe) | [ipc-llm.md](../sdd/ipc-llm.md) | `llm-client.ts`, `llm-worker.ts` |
| US-06 | Cadastrar compra parcelada | [installments.md](../sdd/installments.md), [ipc-db.md](../sdd/ipc-db.md) | `installments/page.tsx`, `db-handlers.js` |
| US-07 | Acompanhar progresso de parcelamento | [installments.md](../sdd/installments.md), [ipc-db.md](../sdd/ipc-db.md) | `installments/page.tsx`, `db-handlers.js:188-220` |
| US-08 | Detectar parcelamentos automaticamente | [installments.md](../sdd/installments.md), [ipc-db.md](../sdd/ipc-db.md) | `detect-installments-sheet.tsx`, `db-handlers.js:241-318` |
| US-09 | Cadastrar assinatura recorrente | [subscriptions.md](../sdd/subscriptions.md) | `subscriptions/page.tsx`, `subscription-sheet.tsx` |
| US-10 | Ativar / Desativar assinatura | [subscriptions.md](../sdd/subscriptions.md) | `subscriptions/page.tsx:83-89` |
| US-11 | Detectar assinaturas automaticamente | [subscriptions.md](../sdd/subscriptions.md), [ipc-db.md](../sdd/ipc-db.md) | `detect-subscriptions-sheet.tsx`, `db-handlers.js:149-166` |
| US-12 | Visualizar resumo mensal | [dashboard.md](../sdd/dashboard.md) | `MonthlyIncomeExpenseChart.tsx` |
| US-13 | Visualizar despesas por categoria | [dashboard.md](../sdd/dashboard.md) | `CategoryExpenseChart.tsx` |
| US-14 | Visualizar faturas de cartão | [dashboard.md](../sdd/dashboard.md), [transactions.md](../sdd/transactions.md) | `CreditCardFaturaChart.tsx`, `lib/transactions.ts` |
| US-15 | Visualizar assinaturas no dashboard | [dashboard.md](../sdd/dashboard.md) | `AccountSubscriptionsCalendar.tsx` |

---

## 4. Arquivos sem cobertura de spec (gaps identificados)

| Arquivo | Motivo da ausência | Risco |
|---|---|---|
| `app/banks/account/page.tsx` | Página de detalhe de conta — não analisada diretamente | 🟡 Médio |
| `app/banks/card/page.tsx` | Página de detalhe de cartão — não analisada diretamente | 🟡 Médio |
| `app/page.tsx` | Página raiz (provavelmente redireciona para dashboard) | 🟢 Baixo |
| `app/layout.tsx` | Layout global com providers Redux/Tooltip | 🟢 Baixo |
| `app/store.tsx`, `app/StoreProvider.tsx` | Redux store configuration | 🟡 Médio |
| `components/ui/*` | Componentes Shadcn/UI — não são regra de negócio | 🟢 Baixo |
| `components/combobox.tsx` | Combobox customizado — UI sem regra de negócio | 🟢 Baixo |
| `electron/runtime-config.js` | Injeção de API key em produção | 🟡 Médio |

---

## 5. Lacunas e Dívidas Técnicas Consolidadas

| ID | Lacuna | Módulo(s) afetado(s) | Severidade |
|---|---|---|---|
| L-01 | Coexistência de formatos de data ISO e DD/MM/YYYY | `ipc-db`, `transactions`, `import` | 🔴 Alta |
| L-02 | Parsing de resposta Groq via `substring` — frágil | `ipc-llm` | 🔴 Alta |
| L-03 | Modelo Groq `openai/gpt-oss-120b` não é público | `ipc-llm` | 🔴 Alta |
| L-04 | `balance` de conta não calculado pelas transações | `banks`, `ipc-db` | 🔴 Alta |
| L-05 | Sem suíte de testes unitários ou de integração | Todos | 🔴 Alta |
| L-06 | `monthlyEquivalent` duplicada em 3 arquivos | `subscriptions`, `dashboard` | 🟡 Média |
| L-07 | `parseYearMonth` duplicada em 2 componentes do dashboard | `dashboard` | 🟡 Média |
| L-08 | Sem `UNIQUE` constraint em `transaction_categories.name` | `categories` | 🟡 Média |
| L-09 | Sem cascade ao deletar conta/cartão (FK órfãs em assinaturas) | `banks`, `subscriptions` | 🟡 Média |
| L-10 | `real_paid_installments < 0` não tratado (first_billing_month futuro) | `installments`, `ipc-db` | 🟡 Média |
| L-11 | `next_due` de assinaturas não é atualizado automaticamente | `subscriptions` | 🟡 Média |
| L-12 | Sem paginação nas listas de transações (performance) | `dashboard`, `banks` | 🟡 Média |
| L-13 | Sem confirmação de exclusão consistente (só subscriptions usa `confirm()`) | `banks`, `installments` | 🟢 Baixa |
| L-14 | Sem página dedicada de gestão de categorias | `categories` | 🟢 Baixa |
| L-15 | Sem backup automático do `finapp.db` | `ipc-db` | 🔴 Alta |

---

## 6. Índice completo de artefatos gerados

### SDDs (`_reversa_sdd/sdd/`)
- [ipc-db.md](../sdd/ipc-db.md)
- [transactions.md](../sdd/transactions.md)
- [import.md](../sdd/import.md)
- [ipc-llm.md](../sdd/ipc-llm.md)
- [electron-main.md](../sdd/electron-main.md)
- [dashboard.md](../sdd/dashboard.md)
- [banks.md](../sdd/banks.md)
- [installments.md](../sdd/installments.md)
- [subscriptions.md](../sdd/subscriptions.md)
- [categories.md](../sdd/categories.md)

### User Stories (`_reversa_sdd/user-stories/`)
- [importar-extrato.md](../user-stories/importar-extrato.md) — US-01, 02, 03
- [categorizar-transacoes.md](../user-stories/categorizar-transacoes.md) — US-04, 05
- [gerenciar-parcelamentos.md](../user-stories/gerenciar-parcelamentos.md) — US-06, 07, 08
- [gerenciar-assinaturas.md](../user-stories/gerenciar-assinaturas.md) — US-09, 10, 11
- [visualizar-dashboard.md](../user-stories/visualizar-dashboard.md) — US-12, 13, 14, 15

### Rastreabilidade (`_reversa_sdd/traceability/`)
- [code-spec-matrix.md](./code-spec-matrix.md) ← este arquivo

### Documentação Arquitetural (`_reversa_sdd/`)
- [architecture.md](../architecture.md)
- [data-dictionary.md](../data-dictionary.md)
- [business-rules.md](../business-rules.md)
- [state-machines.md](../state-machines.md)
- [adrs.md](../adrs.md)
