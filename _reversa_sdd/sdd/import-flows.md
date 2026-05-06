# SDD — Fluxos de Importação por Tipo (`import-flows`)

> Criado em 2026-05-06 | Revisado em 2026-05-06 | `doc_level: detalhado`
> Expande `sdd/import.md` com fluxos distintos para conta bancária e cartão de crédito

> ⚠️ **[Revisão Reviewer — 2026-05-06]** Divergências com `mobile/src/screens/ImportScreen.tsx`:
> - 🔴 Não existe exclusão prévia por mês (`deleteByMonth`) antes de importar; o fluxo atual usa `upsert` com `onConflict: user_id,external_id`.
> - 🔴 A atomicidade "excluir + inserir" não existe, pois a etapa de exclusão prévia não está implementada.
> - 🟡 Para cartão, `billingMonth` é obrigatório e inferido por `closing_day` (confirmado), mas o tipo padrão das transações não é forçado para `card_payment`.
> - 🔴 Formatos de mês estão inconsistentes nesta spec (`AAAA-MM` e `MM/YYYY`); implementação atual usa `MM/YYYY`.

> ✅ **[Revisão Q-03 — 2026-05-06]** Decisão do proprietário: a regra oficial é **atualizar transações já existentes com base no `external_id`** presente no arquivo de importação (estratégia de `upsert`), sem substituição cega por mês.

---

## 1. Motivação

O fluxo de importação precisa ser diferente dependendo do tipo de conta selecionado:

- **Conta bancária**: foco na data real de cada transação, sem conceito de fatura
- **Cartão de crédito**: foco no mês de fatura (`billing_month`) — todas as transações pertencem a uma fatura específica; o mês de fatura é obrigatório e deve ser confirmado pelo usuário

---

## 2. Regra de Idempotência por `external_id`

> A importação deve usar `upsert` por chave lógica de origem (`user_id`, `external_id`) para evitar duplicatas e **atualizar todos os campos** dos registros já existentes quando o mesmo identificador externo reaparece.

| Tipo | Critério de idempotência |
|---|---|
| OFX | `external_id` do lançamento (FITID) |
| CSV sem `external_id` | sem deduplicação forte por identificador externo |

Com isso, reimportações de OFX atualizam o que já existe e inserem apenas novos lançamentos não conhecidos.

### 2.1 Campos atualizados no upsert

Quando uma transação com o mesmo `external_id` já existe, **todos os campos abaixo são sobrescritos** com os valores da importação atual:

| Campo | Comportamento no upsert |
|---|---|
| `account_id` | Atualizado — se a reimportação for de conta bancária, sobrescreve o valor anterior (inclusive se era `null`) |
| `credit_card_id` | Atualizado — se a reimportação for de cartão, sobrescreve o valor anterior (inclusive se era `null`) |
| `billing_month` | Atualizado para o mês de fatura da reimportação atual (ou `null` para conta bancária) |
| `amount` | Atualizado |
| `description` | Atualizado |
| `date` | Atualizado |
| `type` | Atualizado |
| `category_id` | Preservado se o usuário já categorizou manualmente; sobrescrito pela IA apenas se `category_id` era `null` |

> **Exemplo crítico:** Uma transação OFX do FITID `ABC123` foi importada anteriormente como cartão de crédito (`credit_card_id = 5`, `account_id = null`). Ao reimportar o mesmo OFX como extrato de conta bancária, o resultado deve ser: `account_id = 3`, `credit_card_id = null`, `billing_month = null`. O registro é atualizado, não duplicado.

> **Exemplo inverso:** Transação importada como conta bancária (`account_id = 3`, `credit_card_id = null`) e reimportada como cartão de crédito: resultado final `credit_card_id = 5`, `account_id = null`, `billing_month = 'MM/YYYY'`.

### 2.2 Implementação no banco

```sql
-- Supabase upsert com sobrescrita completa de source fields
INSERT INTO transactions (
  user_id, external_id, account_id, credit_card_id,
  billing_month, amount, description, date, type, category_id
)
VALUES (...)
ON CONFLICT (user_id, external_id)
DO UPDATE SET
  account_id      = EXCLUDED.account_id,
  credit_card_id  = EXCLUDED.credit_card_id,
  billing_month   = EXCLUDED.billing_month,
  amount          = EXCLUDED.amount,
  description     = EXCLUDED.description,
  date            = EXCLUDED.date,
  type            = EXCLUDED.type,
  -- category_id preservado se já definido, atualizado apenas se era null
  category_id     = COALESCE(transactions.category_id, EXCLUDED.category_id);
```

---

## 3. Passo 0 — Escolha do Tipo de Importação

A tela de importação abre sempre com a escolha do tipo:

```
┌──────────────────────────────────────────┐
│  O que você quer importar?               │
│                                          │
│  [ 🏦 Extrato de conta bancária    ]    │
│  [ 💳 Fatura de cartão de crédito  ]    │
└──────────────────────────────────────────┘
```

Após a escolha, o usuário avança para o passo de upload correspondente ao tipo selecionado.

---

## 4. Fluxo A — Importação de Conta Bancária

### Passo 1 — Upload do arquivo

- Formatos aceitos: OFX, CSV
- Seleção da **conta bancária** de destino (lista das contas cadastradas do usuário)
- Sem campo de mês de fatura — a data é lida diretamente do arquivo

### Passo 2 — Preview

```
┌──────────────────────────────────────────────────────────┐
│  Itaú Corrente — 01/05/2026 a 31/05/2026                │
├────────────┬───────────────────┬──────────┬─────────────┬──────────────┤
│ Data       │ Descrição         │ Valor    │ Categoria   │ Status       │
├────────────┼───────────────────┼──────────┼─────────────┼──────────────┤
│ 03/05/2026 │ Supermercado ABC  │ -R$85,00 │ Alimentação │ 🔄 Atualizar │
│ 05/05/2026 │ Salário           │ +R$5.000  │ Renda       │ ✨ Nova      │
└────────────┴───────────────────┴──────────┴─────────────┴──────────────┘
```

- Coluna de data visível com formato `DD/MM/AAAA`
- Usuário pode editar descrição, tipo e categoria por linha
- Botão "Categorizar com IA" disponível
- Coluna **Status** indica:
  - `✨ Nova` — transação será inserida pela primeira vez
  - `🔄 Atualizar` — `external_id` já existe; todos os campos serão sobrescritos (inclusive `account_id`/`credit_card_id`)
  - Linhas marcadas como `🔄 Atualizar` ficam selecionadas por padrão — o usuário pode desmarcar para ignorar a atualização

### Passo 3 — Confirmação (Fluxo A)

```
┌────────────────────────────────────────────────┐
│  Confirmar importação                          │
│                                                │
│  Conta:         Itaú Corrente                 │
│  Período:       01/05/2026 – 31/05/2026       │
│  Novas:         47 transações                 │
│  Atualizadas:   3 transações (mesmo FITID)    │
│    ↳ source alterado: cartão → conta          │
│  Ignoradas:     0                             │
│                                                │
│  [ Cancelar ]          [ Confirmar ]          │
└────────────────────────────────────────────────┘
```

---

## 5. Fluxo B — Importação de Fatura de Cartão de Crédito

### Passo 1 — Upload do arquivo

- Formatos aceitos: OFX, CSV
- Seleção do **cartão de crédito** de destino (lista dos cartões cadastrados do usuário)
- Campo de **mês de fatura** obrigatório (mês/ano): selector com mês e ano
  - Inferência automática: se o cartão tiver `closing_day` configurado, o sistema calcula e pré-preenche o mês provável com base na data do arquivo
  - Usuário pode alterar se necessário

### Passo 2 — Preview (Fluxo B)

```
┌──────────────────────────────────────────────────────────┐
│  Nubank Roxinho — Fatura Maio/2026                       │
├───────────────────────────┬──────────────┬───────────────┬──────────────┤
│ Descrição                 │ Valor        │ Categoria     │ Status       │
├───────────────────────────┼──────────────┼───────────────┼──────────────┤
│ iFood                     │ -R$45,00     │ Alimentação   │ ✨ Nova      │
│ Spotify                   │ -R$21,90     │ Assinatura    │ 🔄 Atualizar │
└───────────────────────────┴──────────────┴───────────────┴──────────────┘
```

- Coluna de data **não exibida** — todas pertencem à mesma fatura
- Badge de contexto no topo: nome do cartão + mês de fatura
- Tipo padrão de todas as transações: `card_payment` (pode ser ajustado pelo usuário ou pela IA)
- Usuário pode editar descrição, tipo e categoria por linha
- Botão "Categorizar com IA" disponível
- Coluna **Status** indica `✨ Nova` ou `🔄 Atualizar` (mesmo comportamento do Fluxo A)

### Passo 3 — Confirmação (Fluxo B)

```
┌────────────────────────────────────────────────┐
│  Confirmar importação                          │
│                                                │
│  Cartão:        Nubank Roxinho                │
│  Fatura:        Maio/2026                     │
│  Novas:         21 transações                 │
│  Atualizadas:   1 transação (mesmo FITID)     │
│    ↳ source alterado: conta → cartão          │
│  Ignoradas:     0                             │
│                                                │
│  [ Cancelar ]          [ Confirmar ]          │
└────────────────────────────────────────────────┘
```

---

## 6. Diferenças entre os fluxos (resumo)

| Aspecto | Conta Bancária | Cartão de Crédito |
|---|---|---|
| Entidade destino | conta bancária | cartão de crédito |
| Referência na transação | `account_id` | `credit_card_id` |
| Data visível no preview | sim (`DD/MM/AAAA`) | não (substituída pelo badge de fatura) |
| Mês de fatura | não se aplica | obrigatório |
| Tipo padrão das transações | inferido | `card_payment` |
| Inferência de mês | não | sim (via `closing_day`) |
| Exclusão prévia por | não aplicável — usa upsert por `external_id` | não aplicável — usa upsert por `external_id` |

---

## 7. Estado interno da tela de importação

O estado da tela progride por 3 passos: `tipo → upload → preview`.

Campos necessários ao longo do fluxo:

| Campo | Tipo | Quando presente |
|---|---|---|
| `sourceType` | `bank_account` ou `credit_card` | sempre (após passo 0) |
| `accountId` | identificador | fluxo A |
| `creditCardId` | identificador | fluxo B |
| `billingMonth` | mês/ano (`MM/YYYY`) | fluxo B |
| `transactions` | lista de transações parseadas | após upload |

---

## 8. Critérios de Aceite

- [ ] Tela de importação sempre começa com a escolha do tipo (conta / cartão)
- [ ] Fluxo A não exibe campo de mês de fatura
- [ ] Fluxo B exige confirmação do mês de fatura antes de avançar
- [ ] Antes de confirmar, o sistema informa quantidade total de novas, atualizadas e ignoradas conforme `external_id`
- [ ] Reimportações com mesmo `external_id` atualizam **todos os campos** do registro existente, incluindo `account_id`, `credit_card_id` e `billing_month`
- [ ] Uma transação previamente importada como cartão pode ser reimportada como conta bancária: `credit_card_id` vira `null`, `account_id` é preenchido com o novo valor
- [ ] Uma transação previamente importada como conta bancária pode ser reimportada como cartão: `account_id` vira `null`, `credit_card_id` e `billing_month` são preenchidos
- [ ] `category_id` é preservado se já foi definido manualmente; sobrescrito pela IA somente se era `null`
- [ ] Preview exibe coluna de status (`✨ Nova` / `🔄 Atualizar`) por linha
- [ ] Estratégia de deduplicação por mês inteiro (`deleteByMonth`) não é utilizada
- [ ] Preview mostra coluna de data no fluxo A e badge de fatura no fluxo B
