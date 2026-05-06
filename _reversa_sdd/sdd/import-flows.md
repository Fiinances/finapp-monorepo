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

> A importação deve usar `upsert` por chave lógica de origem (`user_id`, `external_id`) para evitar duplicatas e atualizar registros já existentes quando o mesmo identificador externo reaparece.

| Tipo | Critério de idempotência |
|---|---|
| OFX | `external_id` do lançamento (FITID) |
| CSV sem `external_id` | sem deduplicação forte por identificador externo |

Com isso, reimportações de OFX atualizam o que já existe e inserem apenas novos lançamentos não conhecidos.

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
├────────────┬───────────────────┬──────────┬─────────────┤
│ Data       │ Descrição         │ Valor    │ Categoria   │
├────────────┼───────────────────┼──────────┼─────────────┤
│ 03/05/2026 │ Supermercado ABC  │ -R$85,00 │ Alimentação │
│ 05/05/2026 │ Salário           │ +R$5.000  │ Renda       │
└────────────┴───────────────────┴──────────┴─────────────┘
```

- Coluna de data visível com formato `DD/MM/AAAA`
- Usuário pode editar descrição, tipo e categoria por linha
- Botão "Categorizar com IA" disponível
- Linhas já existentes no banco (mesma `external_id` OFX) ficam marcadas como "já importada" e desmarcadas por padrão

### Passo 3 — Confirmação

```
┌────────────────────────────────────────────────┐
│  Confirmar importação                          │
│                                                │
│  Conta:         Itaú Corrente                 │
│  Período:       01/05/2026 – 31/05/2026       │
│  Transações:    47 novas | 3 ignoradas        │
│  ⚠ Exclusão:   12 transações existentes       │
│                 de Maio/2026 serão excluídas  │
│                 antes da importação            │
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

### Passo 2 — Preview

```
┌──────────────────────────────────────────────────────────┐
│  Nubank Roxinho — Fatura Maio/2026                       │
├───────────────────────────┬──────────────┬───────────────┤
│ Descrição                 │ Valor        │ Categoria     │
├───────────────────────────┼──────────────┼───────────────┤
│ iFood                     │ -R$45,00     │ Alimentação   │
│ Spotify                   │ -R$21,90     │ Assinatura    │
└───────────────────────────┴──────────────┴───────────────┘
```

- Coluna de data **não exibida** — todas pertencem à mesma fatura
- Badge de contexto no topo: nome do cartão + mês de fatura
- Tipo padrão de todas as transações: `card_payment` (pode ser ajustado pelo usuário ou pela IA)
- Usuário pode editar descrição, tipo e categoria por linha
- Botão "Categorizar com IA" disponível

### Passo 3 — Confirmação

```
┌────────────────────────────────────────────────┐
│  Confirmar importação                          │
│                                                │
│  Cartão:        Nubank Roxinho                │
│  Fatura:        Maio/2026                     │
│  Transações:    22 novas | 0 ignoradas        │
│  ⚠ Exclusão:   22 transações existentes       │
│                 da fatura Maio/2026 serão     │
│                 excluídas antes da importação │
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
| Exclusão prévia por | `account_id` + mês de `date` | `credit_card_id` + `billing_month` |

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
- [ ] Antes de confirmar, o sistema informa quantidade total processada e ignorada/atualizada conforme `external_id`
- [ ] Reimportações com mesmo `external_id` atualizam o registro existente em vez de duplicar
- [ ] Estratégia de deduplicação por mês inteiro (`deleteByMonth`) não é obrigatória
- [ ] Preview mostra coluna de data no fluxo A e badge de fatura no fluxo B
