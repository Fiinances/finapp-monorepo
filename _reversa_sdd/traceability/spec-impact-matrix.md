# Spec Impact Matrix — Finapp

> Gerado pelo reversa-architect em 2026-05-02
> ✅ **Atualizado em 2026-05-06 (Tarefa 18-E):** Novos módulos mobile incorporados (`dashboard-month-selector`, `transactions-filters`, `ui-header-pattern`, `import-flows`).
> ✅ [Revisão Q-05 — 2026-05-06] Fonte de verdade definida pelo proprietário: legado web e mobile atual com pesos equivalentes na reconstrução.

---

## Legenda

| Símbolo | Significado |
|---|---|
| 🔴 **ALTO** | Mudança causa impacto crítico — falhas ou incompatibilidade |
| 🟡 **MÉDIO** | Mudança requer atualização em múltiplos pontos |
| 🟢 **BAIXO** | Mudança isolada, impacto mínimo |
| — | Sem relação de impacto |

---

## Matriz: Módulo → Módulo Impactado

### Módulos Legado Web

| Origem ↓ / Destino → | `ipc-db` | `ipc-llm` | `transactions` | `import` | `dashboard` | `banks` | `installments` | `subscriptions` | `categories` | `electron-main` |
|---|---|---|---|---|---|---|---|---|---|---|
| **`ipc-db`** | — | — | 🟡 (schema) | 🔴 (insert/dedup) | 🔴 (dados) | 🔴 (CRUD) | 🔴 (progresso) | 🔴 (CRUD) | 🔴 (CRUD) | — |
| **`ipc-llm`** | — | — | — | 🔴 (categorize) | — | — | — | — | — | — |
| **`transactions`** | 🟢 (tipos) | — | — | 🔴 (usa parsers) | 🔴 (usa MonthSummary) | — | — | — | — | — |
| **`import`** | 🔴 (usa insert) | 🟡 (auto-cat) | 🔴 (usa parsers) | — | — | 🟡 (acessa accounts) | — | — | — | — |
| **`dashboard`** | 🟡 (consome dados) | — | 🔴 (usa grouping) | — | — | — | — | — | — | — |
| **`banks`** | 🔴 (CRUD) | — | — | 🟡 (abre import) | — | — | — | — | — | — |
| **`installments`** | 🔴 (CRUD + detect) | — | — | — | — | — | — | — | — | — |
| **`subscriptions`** | 🔴 (CRUD + detect) | — | — | — | — | — | — | — | — | — |
| **`categories`** | 🔴 (CRUD) | — | — | — | — | — | — | — | — | — |
| **`electron-main`** | 🔴 (registra handlers) | 🔴 (registra handlers) | — | — | — | — | — | — | — | — |

### Módulos Novos (Mobile)

| Origem ↓ / Destino → | `transactions` | `import` | `dashboard` | `dashboard-month-selector` | `transactions-filters` | `ui-header-pattern` | `import-flows` | `categories` |
|---|---|---|---|---|---|---|---|---|
| **`dashboard-month-selector`** | 🟡 (escopo mensal) | — | 🔴 (controla mês exibido) | — | — | — | — | — |
| **`transactions-filters`** | 🔴 (query scope) | 🟡 (filtro origem) | — | — | — | — | — | 🟡 (filtro categoria) |
| **`ui-header-pattern`** | 🟢 (cosmético) | 🟢 (cosmético) | 🟢 (cosmético) | — | — | — | 🟢 (cosmético) | — |
| **`import-flows`** | 🔴 (upsert ext_id) | 🔴 (dedup rule) | — | — | — | — | — | — |

---

## Análise de Impacto por Entidade

### Mudança em `transactions` (schema)

Impacta: `ipc-db`, `import`, `dashboard`, `banks/account`, `installments`, `app/types/electron.d.ts`

### Mudança em `billing_month` (formato)

Impacta: `ipc-db` (deleteByMonth), `import` (inferBillingMonth), `transactions` (txBillingMonth), `dashboard` (gráficos por mês), `installments` (first_billing_month)

### Mudança no `MonthSelector` (formato `MM/YYYY`)

Impacta: `mobile/src/screens/DashboardScreen.tsx` (state selectedMonth), `mobile/src/hooks/useDashboard.ts` (query param), `mobile/src/hooks/useTransactions.ts` (filtro mensal), `mobile/src/hooks/useInstallments.ts` (filtro)

> 🔴 Crítico: qualquer mudança de formato de data quebra todos os hooks que derivam queries de `selectedMonth`.

### Mudança em `external_id` (idempotência de importação)

Impacta: `mobile/src/lib/importParsers.ts` (geração do hash), `mobile/src/screens/ImportScreen.tsx` (fluxo de upsert), `supabase/transactions` (constraint UNIQUE em external_id)

> 🔴 Crítico: mudança no algoritmo de geração de `external_id` causará duplicatas ou falha de upsert.

### Mudança em `AppHeader` (interface de props)

Impacta: `mobile/src/screens/DashboardScreen.tsx`, `mobile/src/screens/TransactionsScreen.tsx`, `mobile/src/screens/BanksScreen.tsx`, `mobile/src/screens/InstallmentsScreen.tsx`, `mobile/src/screens/SubscriptionsScreen.tsx`, `mobile/src/screens/ImportScreen.tsx`

> 🟡 Médio: mudança em props do AppHeader requer atualização em todas as 6 telas, mas impacto é localizado (só na interface visual).

### Mudança no algoritmo de progresso de parcelamentos

Impacta: `ipc-db:installmentGroups:list`, `installments/page.tsx` (exibição)

### Mudança na API IPC (adição/remoção de canal)

Impacta: `electron/preload.js` (contextBridge), `app/types/electron.d.ts` (interface ElectronAPI), todos os módulos que consomem o canal

### Mudança na Groq API (modelo/formato de resposta)

Impacta: `electron/llm-handlers.js`, `import-dropdown.tsx` (auto-categorização)

---

## Pontos de Maior Acoplamento

| Componente | Nível de Acoplamento | Razão |
|---|---|---|
| `electron/db-handlers.js` | 🔴 CRÍTICO | Ponto único de acesso ao banco — todos os módulos dependem |
| `app/types/electron.d.ts` | 🔴 CRÍTICO | Contrato entre renderer e main — qualquer mudança de API quebra ambos |
| `electron/preload.js` | 🔴 CRÍTICO | Bridge de segurança — mudanças aqui afetam tudo que usa `electronAPI` |
| `lib/transactions.ts` | 🟡 ALTO | Lógica central de parsing e grouping usada em múltiplos pontos |
| `components/import-dropdown.tsx` | 🟡 ALTO | Módulo mais complexo, depende de `ipc-db`, `ipc-llm` e `transactions` |

**Pontos críticos adicionais (Mobile):**

| Componente | Nível de Acoplamento | Razão |
|---|---|---|
| `mobile/src/hooks/useTransactions.ts` | 🟡 ALTO | Usado por TransactionsScreen e TransactionList; qualquer mudança de schema Supabase quebra aqui |
| `mobile/src/lib/importParsers.ts` | 🟡 ALTO | Parser OFX/CSV — mudança de formato ou regra de `external_id` quebra toda a importação |
| `mobile/src/contexts/AuthContext.tsx` | 🔴 CRÍTICO | Fonte de verdade da sessão — todos os hooks Supabase dependem do token de auth |
| `mobile/src/screens/DashboardScreen.tsx` | 🟡 ALTO | Centraliza MonthSelector e gráficos; impacta `useDashboard`, `useInstallments`, `useSubscriptions` |
