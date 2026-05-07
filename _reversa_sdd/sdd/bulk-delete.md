# SDD — Exclusão em Lote (`bulk-delete`)

> Criado em 2026-05-07 | `doc_level: detalhado`

---

## 1. Visão Geral

O usuário precisa poder excluir em massa transações de um mês — seja uma fatura de cartão inteira (para reimportar) ou as transações bancárias de um mês específico. Ambas as ações devem ser acessíveis de forma contextual e protegidas por confirmação explícita.

---

## 2. Padrão de UI/UX

### 2.1 Ponto de Acesso — Menu Contextual `⋮` no Header

- Um ícone de menu de três pontos (`more-vertical` / Feather) é adicionado como `rightElement` no `AppHeader` de cada tela.
- Ao pressionar, exibe um **menu de ações contextual** (dropdown ou bottom sheet simples) com as opções disponíveis.
- Esse padrão é consistente com as boas práticas de Material Design 3 e iOS HIG: ações destrutivas nunca ficam expostas, apenas dentro de um menu secundário.

### 2.2 Confirmação — Bottom Sheet Destrutivo

- Ao selecionar a ação de exclusão no menu, exibe-se um **Bottom Sheet de confirmação** (não um simples `Alert.alert`) com:
  - **Título:** "Excluir [fatura / transações] de [Mês/Ano]?"
  - **Descrição:** Texto explicativo da ação e da contagem de itens afetados (ex: "Isso excluirá 34 transações de cartão de crédito de Mai/2026. Esta ação não pode ser desfeita.").
  - **Botão primário vermelho:** "Excluir tudo"
  - **Botão secundário:** "Cancelar"
- Usar `useSafeAreaInsets` para garantir que os botões não fiquem atrás da navbar do Android (RN-12 do import.md).

---

## 3. Funcionalidade A — Excluir Fatura do Mês (CreditCardBillsScreen)

### 3.1 Localização
Menu `⋮` no header da `CreditCardBillsScreen`.

### 3.2 Opções do Menu
- **"Excluir fatura de [Mês/Ano]"** — exclui todas as transações de cartão do mês selecionado.

### 3.3 Comportamento
1. Usuário abre o menu `⋮`.
2. Usuário seleciona "Excluir fatura de [Mês/Ano]".
3. Bottom sheet de confirmação é exibido com a contagem de transações do mês.
4. Ao confirmar:
   - Deleta todas as transações onde `credit_card_id IS NOT NULL` e `billing_month = selectedMonth` do usuário autenticado.
   - Exibe feedback visual de progresso (loading indicator no botão).
   - Ao finalizar: fecha o bottom sheet e chama `refetch()`.
5. Se não houver transações no mês selecionado, exibir um `Alert` informando "Nenhuma transação encontrada nesta fatura."

### 3.4 Query Supabase
```typescript
await supabase
  .from('transactions')
  .delete()
  .eq('user_id', userId)
  .not('credit_card_id', 'is', null)
  .eq('billing_month', selectedMonth);
```

---

## 4. Funcionalidade B — Excluir Transações do Mês (TransactionsScreen)

### 4.1 Localização
Menu `⋮` no header da `TransactionsScreen`, visível apenas quando há filtro de mês ativo (`filters.month !== null`).

> **Decisão de UX:** Exigir que o usuário filtre por mês antes de ver a opção de exclusão em lote. Isso evita exclusão acidental de todos os dados sem contexto de mês.

### 4.2 Opções do Menu
- **"Excluir transações de [Mês/Ano]"** — exclui apenas as transações visíveis naquele mês filtrado.

### 4.3 Comportamento
1. Menu `⋮` aparece no header **somente quando `filters.month` está definido**.
2. Usuário abre menu → seleciona ação.
3. Bottom sheet confirma com a contagem de transações filtradas.
4. Ao confirmar:
   - Deleta as transações pelo mês (`date` no formato `YYYY-MM-%`) do usuário autenticado, respeitando os outros filtros ativos (ex: apenas bancárias ou apenas cartão).
   - Exibe loading e ao finalizar chama `refetch()`.
5. Se nenhuma transação for encontrada, informa ao usuário.

### 4.4 Query Supabase
```typescript
// billing_month filter para cartões, date filter para conta bancária
const [mm, yy] = filters.month.split('/');
const from = `${yy}-${mm}-01`;
const to = `${yy}-${mm}-31`;

await supabase
  .from('transactions')
  .delete()
  .eq('user_id', userId)
  .gte('date', from)
  .lte('date', to);
```

---

## 5. Regras de Negócio

| ID | Regra | Confiança |
|---|---|---|
| RN-01 | A exclusão em lote aplica-se apenas às transações do `user_id` autenticado (RLS enforcement). | 🟢 |
| RN-02 | O menu `⋮` de exclusão de transações na `TransactionsScreen` só aparece quando há filtro de mês ativo. | 🟢 |
| RN-03 | O bottom sheet de confirmação exibe a contagem exata de transações a serem excluídas. | 🟢 |
| RN-04 | A exclusão da fatura filtra por `billing_month` (campo específico da transação de cartão). | 🟢 |
| RN-05 | Caso não haja transações no escopo, o sistema informa o usuário via Alert e não executa a query. | 🟢 |
| RN-06 | O botão de confirmação exibe loading durante a operação para evitar duplo clique. | 🟢 |

---

## 6. Componente Reutilizável: `BulkDeleteSheet`

Para padronização, criar um componente único `BulkDeleteSheet.tsx` em `components/ui/` com as props:

```typescript
interface BulkDeleteSheetProps {
  visible: boolean;
  title: string;           // ex: "Excluir fatura de Mai/2026?"
  description: string;     // ex: "34 transações serão excluídas..."
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}
```

---

## 7. Critérios de Aceitação

### CA-01 — Excluir fatura inteira do cartão

```
Dado:  25 transações de cartão em "05/2026"
Quando: usuário abre menu ⋮ > "Excluir fatura de Mai/2026" > confirma
Então: 25 transações são excluídas do banco
       gráfico e lista são atualizados
       mês fica zerado no gráfico
```

### CA-02 — Excluir transações mensais sem filtro ativo

```
Dado:  usuário na TransactionsScreen sem filtro de mês
Quando: usuário olha para o header
Então: ícone ⋮ NÃO é exibido (ou o menu não contém a opção de exclusão em lote)
```

### CA-03 — Excluir transações mensais com filtro ativo

```
Dado:  filtro de mês "04/2026" ativo na TransactionsScreen
       30 transações visíveis
Quando: usuário abre menu ⋮ > "Excluir transações de Abr/2026" > confirma
Então: 30 transações são excluídas
       lista fica vazia
       contadores de filtro atualizados
```

### CA-04 — Cancelar exclusão

```
Dado:  bottom sheet de confirmação visível
Quando: usuário pressiona "Cancelar"
Então: nenhuma exclusão ocorre
       bottom sheet fecha
```
