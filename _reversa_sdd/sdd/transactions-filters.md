# SDD — Filtros de Transações (`transactions-filters`)

> Criado em 2026-05-06 | Revisado em 2026-05-06 | `doc_level: detalhado`
> Expande `sdd/transactions.md` com sistema de filtragem avançada

> ⚠️ **[Revisão Reviewer — 2026-05-06]** Estado de implementação no código atual (`mobile/src/screens/TransactionsScreen.tsx`, `mobile/src/hooks/useTransactions.ts`):
> - 🔴 `TransactionFilterSheet` não existe.
> - 🔴 `useTransactionFilters` não existe.
> - 🔴 Filtros por mês/tipo/categoria/origem não existem.
> - 🟢 Existe apenas botão visual de filtro no header, sem ação vinculada.
> - 🟡 Esta spec está em nível de proposta e não representa o comportamento já entregue.

> ✅ **[Revisão Q-02 — 2026-05-06]** Decisão do proprietário: o módulo de filtros é requisito confirmado para a tela de transações, com foco em filtros pela própria tabela de transações (mês, categoria, tipo e origem crédito/conta bancária). O critério `importBatchId` foi descartado.

---

## 1. Propósito

Permitir que o usuário filtre a lista de transações por múltiplos critérios simultaneamente, sem sair da tela. O filtro ativo deve ser visível no header e persistir durante a sessão.

---

## 2. Critérios de Filtragem

| Filtro | Tipo | Valores possíveis |
|---|---|---|
| **Mês** | seleção única | qualquer mês com transações; padrão = mês atual |
| **Tipo de transação** | múltipla seleção | entrada, saída, transferência, investimento, fatura |
| **Categoria** | múltipla seleção | categorias do usuário + "Sem categoria" |
| **Origem** | seleção única | conta bancária, cartão de crédito, manual, todas |

---

## 3. Componente `TransactionFilterSheet`

Bottom sheet deslizável que aparece ao tocar no botão "filter" do header.

### 3.1 Layout

```
┌─────────────────────────────────────────────────┐
│  ━━━━ (drag handle)                             │
│  Filtrar transações              [Limpar tudo]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Mês                                            │
│  ← Abril 2026 →  (seletor com setas prev/next) │
│                                                 │
│  Tipo de transação                              │
│  [↙ Entrada] [↗ Saída] [↺ Transf.] [📈 Invest] [💳 Fatura] │
│  (pills toggleáveis, multi-select)              │
│                                                 │
│  Categoria                                      │
│  [Alimentação] [Transporte] [+ 3 mais…]         │
│  (chips expansíveis, multi-select)              │
│                                                 │
│  Origem                                         │
│  [Todas] [Conta bancária] [Cartão] [Manual]     │
│  (radio pills)                                  │
│                                                 │
│  [ Aplicar filtros ]                            │
└─────────────────────────────────────────────────┘
```

### 3.2 Comportamento

- **Mês**: seletor com `<` / `>` para navegar entre meses com transações; mostra "Todos os meses" como opção de limpeza do filtro
- **Tipo de transação**: pills com ícone Feather, multi-select; quando nenhum selecionado = "todos"
- **Categoria**: lista scrollável horizontal de chips; "Sem categoria" como opção separada
- **Origem**: radio group — seleção exclusiva; `all` = sem filtro por origem
- Botão **"Limpar tudo"**: reseta todos os filtros para o estado padrão
- Botão **"Aplicar filtros"**: fecha o sheet e re-renderiza a lista

---

## 4. Estado do Filtro

```ts
interface TransactionFilters {
  month: string | null;                         // 'MM/YYYY' ou null = todos
  types: TransactionType[];                     // [] = todos
  categoryIds: (number | 'uncategorized')[];   // [] = todas
  importSource: 'all' | 'bank_account' | 'credit_card' | 'manual';
}

const DEFAULT_FILTERS: TransactionFilters = {
  month: currentMonthYear(),   // ex: '05/2026'
  types: [],
  categoryIds: [],
  importSource: 'all',
};
```

---

## 5. Hook: `useTransactionFilters`

```ts
const {
  filters,
  setMonth,
  toggleType,
  toggleCategory,
  setImportSource,
  clearFilters,
  activeCount,         // número de filtros ativos (exceto mês padrão)
} = useTransactionFilters();
```

- `activeCount` controla o badge no botão de filtro do header
- Persiste em `useState`; pode ser migrado para `AsyncStorage` futuramente

---

## 6. Lógica de Filtragem no Hook `useTransactions`

```ts
// Filtra localmente após busca — a busca retorna todas as transações do usuário
function applyFilters(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  return transactions.filter((t) => {
    if (filters.month && txBillingMonth(t) !== filters.month) return false;
    if (filters.types.length && !filters.types.includes(t.type)) return false;
    if (filters.categoryIds.length) {
      const match = filters.categoryIds.includes(
        t.category_id ?? 'uncategorized'
      );
      if (!match) return false;
    }
    if (filters.importSource !== 'all') {
      if (filters.importSource === 'manual' && t.import_batch_id != null) return false;
      if (filters.importSource === 'bank_account' && t.account_source !== 'bank_account') return false;
      if (filters.importSource === 'credit_card' && t.account_source !== 'credit_card') return false;
    }
    return true;
  });
}
```

> **Nota:** `t.account_source` é derivado em runtime: se `t.credit_card_id != null` → `'credit_card'`; se `t.account_id != null` → `'bank_account'`; senão `'manual'`.

---

## 7. Indicador Visual no Header

```
Antes (sem filtro):   [≡]  Transações                  [filter]
Depois (com filtros): [≡]  Transações  Abr 2026  [filter 2]
```

- `filter` button recebe badge com `activeCount` quando > 0
- Nome do mês selecionado aparece no header como subtitle ou badge abaixo do título

---

## 8. Critérios de Aceite

- [ ] Botão "filter" no header abre o `TransactionFilterSheet`
- [ ] Filtros de mês, tipo, categoria e origem funcionam individualmente e combinados
- [ ] Badge no botão "filter" mostra contagem de filtros ativos
- [ ] "Limpar tudo" retorna ao estado padrão (mês atual, sem outros filtros)
- [ ] Lista vazia exibe mensagem contextual referenciando os filtros ativos
