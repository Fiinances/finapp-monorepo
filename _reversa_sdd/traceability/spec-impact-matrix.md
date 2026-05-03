# Spec Impact Matrix — Finapp

> Gerado pelo reversa-architect em 2026-05-02

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

---

## Análise de Impacto por Entidade

### Mudança em `transactions` (schema)

Impacta: `ipc-db`, `import`, `dashboard`, `banks/account`, `installments`, `app/types/electron.d.ts`

### Mudança em `billing_month` (formato)

Impacta: `ipc-db` (deleteByMonth), `import` (inferBillingMonth), `transactions` (txBillingMonth), `dashboard` (gráficos por mês), `installments` (first_billing_month)

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
