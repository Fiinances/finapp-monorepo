# SDD — Histórico de Importações (`import-history`)

> Criado em 2026-05-07 | `doc_level: detalhado`

---

## 1. Visão Geral

O aplicativo mantém um registro persistente de cada importação realizada (`import_records`). Cada registro vincula um conjunto de transações a uma fonte específica (conta bancária ou cartão de crédito), a um mês de competência e ao arquivo original importado.

Isso permite:
1. **Rastreabilidade** — saber exatamente de qual arquivo cada transação veio.
2. **Exclusão granular** — excluir todas as transações de uma importação específica sem afetar outros cartões/contas do mesmo mês.
3. **Deduplicação** — reimportar o mesmo mês/destino substitui as transações e o registro, sem duplicar.

---

## 2. Schema: Tabela `import_records`

```sql
CREATE TABLE import_records (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_type VARCHAR(20) NOT NULL CHECK (destination_type IN ('bank_account', 'credit_card')),
    destination_id  BIGINT NOT NULL,
    billing_month   VARCHAR(7),        -- MM/YYYY — obrigatório para credit_card, null para bank_account
    month           VARCHAR(7) NOT NULL, -- MM/YYYY — mês de competência das transações
    file_name       VARCHAR(255),
    file_format     VARCHAR(10) CHECK (file_format IN ('ofx', 'csv')),
    transaction_count INT NOT NULL DEFAULT 0,
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice de unicidade para deduplicação
CREATE UNIQUE INDEX import_records_unique_idx
    ON import_records (user_id, destination_type, destination_id, month);
```

> **RN-01:** A chave única é `(user_id, destination_type, destination_id, month)`. Reimportar o mesmo mês/destino faz UPSERT — atualiza o registro existente.

---

## 3. Alteração na Tabela `transactions`

```sql
ALTER TABLE transactions
    ADD COLUMN import_id BIGINT REFERENCES import_records(id) ON DELETE CASCADE;
```

> **RN-02:** `import_id` com `ON DELETE CASCADE`: excluir um `import_record` exclui automaticamente todas as transações vinculadas — sem necessidade de query manual de exclusão.

---

## 4. Lógica de Importação Atualizada (`confirmImport`)

### 4.1 Fluxo de UPSERT do Registro

```
1. Montar o registro:
   {
     destination_type: 'bank_account' | 'credit_card',
     destination_id: accountId | creditCardId,
     month: derivado das transações (mês mais frequente),
     billing_month: billingMonth (apenas para cartões),
     file_name: fileName,
     file_format: 'ofx' | 'csv',
     transaction_count: transações.length
   }

2. UPSERT em import_records (ON CONFLICT DO UPDATE):
   → Retorna o import_record.id

3. Deletar transações antigas vinculadas a esse import_id
   → DELETE FROM transactions WHERE import_id = <id>

4. Inserir novas transações com import_id = <id>
   → Garante que transações sempre correspondam ao arquivo mais recente

5. Atualizar import_records.transaction_count e updated_at
```

> **RN-03:** O UPSERT deleta as transações antigas antes de inserir as novas (via import_id). Transações criadas manualmente (import_id IS NULL) **nunca são afetadas**.

### 4.2 Pseudocódigo TypeScript

```typescript
async function confirmImport(transactions, destination, billingMonth, fileInfo) {
    const month = deriveMonth(transactions); // mês mais frequente entre as transações

    // 1. UPSERT do registro de importação
    const { data: record, error } = await supabase
        .from('import_records')
        .upsert({
            user_id: user.id,
            destination_type: destination.type,
            destination_id: destination.id,
            month,
            billing_month: billingMonth ?? null,
            file_name: fileInfo.name,
            file_format: fileInfo.format,
            transaction_count: transactions.length,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,destination_type,destination_id,month',
        })
        .select()
        .single();

    if (error) throw error;

    // 2. Deletar transações antigas deste import (CASCADE cuidaria, mas precisamos do ID)
    await supabase
        .from('transactions')
        .delete()
        .eq('import_id', record.id);

    // 3. Inserir novas transações com import_id
    const enriched = transactions.map(t => ({
        ...t,
        import_id: record.id,
        user_id: user.id,
    }));

    await supabase.from('transactions').insert(enriched);
}
```

---

## 5. Tela `ImportHistoryScreen`

### 5.1 Propósito

Exibe a lista de todas as importações realizadas pelo usuário, permitindo visualizar detalhes e excluir individualmente.

### 5.2 Layout

```
┌─────────────────────────────────────────┐
│  Importações                    [⋮]     │  ← Header (AppHeader)
├─────────────────────────────────────────┤
│  [Filtro: Mês ▾] [Tipo ▾]              │  ← Filtros inline
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │ 🔵 Nubank (Cartão)               │   │  ← Card de importação
│  │ Maio/2025 · Fatura 05/2025      │   │
│  │ 143 transações                   │   │
│  │ OFX · importado 07/05/2025 18:32 │   │
│  │                         [🗑️]    │   │  ← Botão excluir
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 🟢 Banco do Brasil (Conta)       │   │
│  │ Maio/2025                        │   │
│  │ 42 transações                    │   │
│  │ CSV · importado 06/05/2025 09:15 │   │
│  │                         [🗑️]    │   │
│  └──────────────────────────────────┘   │
│                                         │
│  (empty state se não houver importações)│
└─────────────────────────────────────────┘
```

### 5.3 Card de Importação — Campos

| Campo | Conteúdo |
|---|---|
| Ícone + Nome | Cor do cartão/conta + nome do destino |
| Tipo | `Cartão de Crédito` ou `Conta Bancária` |
| Mês | Mês de competência formatado (ex: `Maio/2025`) |
| Fatura | `Fatura MM/YYYY` — exibido apenas para cartões |
| Transações | `N transações` |
| Formato + Data | `OFX` ou `CSV` · `importado DD/MM/YYYY HH:mm` |
| Botão excluir | Ícone de lixeira vermelho → confirma via `BulkDeleteSheet` |

### 5.4 Filtros

- **Mês:** seletor MM/YYYY (mesmo padrão do filtro de transações — setas ← →)
- **Tipo:** pills `Todos | Cartão | Conta`

### 5.5 Exclusão de Importação

```
1. Usuário toca no ícone 🗑️
2. BulkDeleteSheet abre com:
   - Título: "Excluir importação"
   - Descrição: "Isso removerá [N] transações importadas de [Nome] em [Mês]. Transações criadas manualmente não serão afetadas."
3. Usuário confirma
4. DELETE FROM import_records WHERE id = <id>
   → ON DELETE CASCADE remove automaticamente as transações vinculadas
5. Lista é recarregada (refetch)
```

> **RN-04:** Transações com `import_id IS NULL` (criadas manualmente) **não são afetadas** pela exclusão de importação.

---

## 6. Hook `useImportHistory`

```typescript
interface ImportRecord {
    id: number;
    destination_type: 'bank_account' | 'credit_card';
    destination_id: number;
    month: string;              // MM/YYYY
    billing_month: string | null;
    file_name: string | null;
    file_format: 'ofx' | 'csv' | null;
    transaction_count: number;
    imported_at: string;        // ISO
    updated_at: string;         // ISO
    // Joined via view ou client-side lookup:
    destination_name: string;
    destination_color: string | null;
}

interface UseImportHistoryReturn {
    records: ImportRecord[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    deleteRecord: (id: number) => Promise<void>;
}
```

**Query Supabase:**
```typescript
supabase
    .from('import_records')
    .select('*')
    .eq('user_id', user.id)
    .order('imported_at', { ascending: false })
```

> O join com nome/cor do destino é feito **client-side** via lookup nos arrays de `accounts` e `creditCards` (já carregados pelo `useBanks`).

---

## 7. Remoção do Bulk Delete por Mês

As funcionalidades de exclusão em massa por mês (`CreditCardBillsScreen` e `TransactionsScreen`) são **removidas**. A exclusão granular é feita exclusivamente pela `ImportHistoryScreen`.

**Justificativa:**
- Um mês de fatura pode conter transações de múltiplos cartões — excluir "o mês" poderia ser ambíguo.
- A `ImportHistoryScreen` oferece controle exato: o usuário escolhe qual importação específica deseja remover.

---

## 8. Regras de Negócio Consolidadas

| ID | Regra |
|---|---|
| RN-01 | Chave única de `import_records`: `(user_id, destination_type, destination_id, month)`. Reimportação faz UPSERT. |
| RN-02 | `transactions.import_id` com `ON DELETE CASCADE`: excluir o registro exclui as transações automaticamente. |
| RN-03 | Transações com `import_id IS NULL` (manuais) nunca são deletadas por fluxo de importação/exclusão de importação. |
| RN-04 | `BulkDeleteSheet` de mês em `CreditCardBillsScreen` e `TransactionsScreen` são removidos. |
| RN-05 | O campo `month` do import record é derivado do mês mais frequente entre as datas das transações importadas. |
| RN-06 | `ImportHistoryScreen` está acessível via SideMenu (item "Importações"). |
| RN-07 | O nome e a cor do destino são resolvidos client-side a partir de `useBanks()`. |

---

## 9. Critérios de Aceitação

### CA-01 — Reimportar substitui sem duplicar

```
Dado:  importação de Nubank Maio/2025 com 143 transações já realizada (import_id = 5)
Quando: usuário importa novo arquivo para Nubank Maio/2025
Então: import_records id=5 é atualizado (transaction_count, updated_at, file_name)
       143 transações antigas (import_id=5) são deletadas
       novas transações são inseridas com import_id=5
       total na lista: ainda 1 registro para Nubank Maio/2025
```

### CA-02 — Excluir importação remove apenas transações vinculadas

```
Dado:  2 importações: Nubank Maio/2025 (import_id=5) e BB Maio/2025 (import_id=6)
       ambas com transações no mesmo mês
Quando: usuário exclui a importação id=5 (Nubank)
Então: import_records id=5 é deletado
       transações com import_id=5 são deletadas (CASCADE)
       transações com import_id=6 (BB) permanecem intactas
       transações manuais (import_id IS NULL) permanecem intactas
```

### CA-03 — Filtro por mês

```
Dado:  3 importações: Abril/2025 (2) e Maio/2025 (1)
Quando: usuário filtra por Maio/2025
Então: lista exibe apenas 1 registro
```

### CA-04 — Estado vazio

```
Dado:  usuário sem importações realizadas
Quando: ImportHistoryScreen é aberta
Então: mensagem "Nenhuma importação encontrada." exibida
       botão ou sugestão para realizar primeira importação
```

---

## 10. Dependências

| Dependência | Uso |
|---|---|
| `supabase` (client) | CRUD em `import_records`, DELETE em `transactions` via CASCADE |
| `useBanks` | Lookup de nome e cor de contas e cartões |
| `BulkDeleteSheet` | Confirmação de exclusão por importação |
| `AppHeader` | Header padrão da tela |
| `useAuth` | `user.id` para queries |
