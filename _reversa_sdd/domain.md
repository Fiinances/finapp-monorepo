# Domínio — Finapp

> Gerado pelo reversa-detective em 2026-05-02
> Fonte: código-fonte, `code-analysis.md`, `data-dictionary.md`, histórico Git

---

## Propósito do Sistema

O **Finapp** é uma aplicação desktop de **controle financeiro pessoal** (PFM — Personal Finance Manager) com foco em **privacidade** e **operação offline**. Todos os dados são armazenados localmente em SQLite. Não há backend próprio nem sincronização na nuvem. A aplicação tem suporte a IA (local e em nuvem) para categorização automática.

---

## Glossário de Domínio

| Termo | Definição | Confiança |
|---|---|---|
| **Transação** | Registro financeiro de entrada, saída, investimento, transferência ou pagamento de fatura | 🟢 CONFIRMADO |
| **Conta bancária** (Account) | Conta corrente, poupança ou similar vinculada ao usuário | 🟢 CONFIRMADO |
| **Cartão de crédito** (CreditCard) | Cartão vinculado a uma conta, com limite, dia de fechamento e vencimento | 🟢 CONFIRMADO |
| **Fatura** | Conjunto de transações de um cartão de crédito em um mês de referência (`billing_month`) | 🟢 CONFIRMADO |
| **Mês de fatura** (billing_month) | Mês ao qual uma transação de cartão pertence, no formato `MM/YYYY` | 🟢 CONFIRMADO |
| **Dia de fechamento** (closing_day) | Dia do mês em que a fatura fecha. Transações após esse dia vão para a fatura do próximo mês | 🟢 CONFIRMADO |
| **Dia de vencimento** (due_day) | Dia do mês em que a fatura vence (pagamento) | 🟢 CONFIRMADO |
| **Parcelamento** (InstallmentGroup) | Compra parcelada no cartão, com valor total dividido em N parcelas mensais | 🟢 CONFIRMADO |
| **Parcela** | Cada fração mensal de um parcelamento, vinculada via `installment_group_id` | 🟢 CONFIRMADO |
| **Assinatura** (Subscription) | Cobrança recorrente (semanal/mensal/anual) com status ativo/inativo | 🟢 CONFIRMADO |
| **Categoria** | Classificação de uma transação (ex: Alimentação, Transporte). Suporta hierarquia via `parent_id` | 🟢 CONFIRMADO |
| **Extrato** | Arquivo OFX ou CSV exportado por um banco, importado pelo usuário | 🟢 CONFIRMADO |
| **Importação** | Processo de 2 etapas (upload → preview/edição → confirmação) para trazer transações de extrato externo | 🟢 CONFIRMADO |
| **Deduplicação** | Prevenção de importação dupla usando `external_id` (FITID do OFX) | 🟢 CONFIRMADO |
| **Auto-categorização** | Uso de LLM (Groq ou local) para sugerir categorias automaticamente | 🟢 CONFIRMADO |
| **Detecção de recorrência** | Algoritmo que encontra transações com descrição e valor estável (± 5%) em ≥ 3 meses | 🟢 CONFIRMADO |
| **Detecção de parcelamento** | Algoritmo que identifica padrão `N/M` na descrição de transações de cartão | 🟢 CONFIRMADO |
| **Progresso de parcelamento** | Número de parcelas consideradas pagas, calculado por meses decorridos desde `first_billing_month` | 🟢 CONFIRMADO |
| **Saldo** (balance) | Campo manual em `accounts` — não é calculado automaticamente a partir das transações | 🟡 INFERIDO |
| **LLM local** | Modelo de linguagem carregado pelo usuário (arquivo `.litertlm`) e executado via MediaPipe em Web Worker | 🟡 INFERIDO |

---

## Regras de Negócio do Domínio

### Transações

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | `amount` é sempre positivo; o campo `type` determina se é entrada ou saída | `app/types/electron.d.ts` | 🟢 |
| RN-02 | Tipos válidos: `income`, `expense`, `investment`, `transfer`, `card_payment` | `app/types/electron.d.ts:8` | 🟢 |
| RN-03 | `transfer` e `card_payment` não contam como despesa nos totais (apenas `expense`) | `lib/transactions.ts:67-70` | 🟢 |
| RN-04 | `investment` não entra no cálculo de `total` (`total = income - expense`) | `lib/transactions.ts:70` | 🟢 |
| RN-05 | Deduplicação por `external_id` — apenas transações OFX | `electron/db-handlers.js:22-32` | 🟢 |
| RN-06 | Transações manuais (`source: manual`) não têm `external_id` | 🟡 INFERIDO | 🟡 |
| RN-07 | Uma transação pertence a uma conta OU a um cartão (nunca ambos) | `app/types/electron.d.ts:3-4` | 🟡 |

### Fatura / Billing Month

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-08 | `billing_month` usa formato `MM/YYYY` | `electron/db-handlers.js:44` | 🟢 |
| RN-09 | Transações com `day > closing_day` pertencem à fatura do mês seguinte | `components/import-dropdown.tsx:213-215` | 🟢 |
| RN-10 | O mês de fatura é inferido por votação majoritária das transações do extrato importado | `components/import-dropdown.tsx:206-227` | 🟢 |
| RN-11 | `deleteByMonth` para cartão deleta transações de `billing_month` OU por data (legado) | `electron/db-handlers.js:112-128` | 🟢 |

### Parcelamentos

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-12 | Mínimo de 2 parcelas por parcelamento | `app/installments/page.tsx:95` | 🟢 |
| RN-13 | `first_billing_month` deve estar no formato `MM/AAAA` com mês entre 01 e 12 | `app/installments/page.tsx:99` | 🟢 |
| RN-14 | Valor por parcela = `total_amount / installments` (distribuição uniforme) | `electron/db-handlers.js:210` | 🟢 |
| RN-15 | Progresso calculado temporalmente: `paid = monthsBetween(first_billing_month, hoje) + 1` | `electron/db-handlers.js:196-208` | 🟢 |
| RN-16 | Deletar um grupo de parcelamento desvincula as transações (não as deleta) | `electron/db-handlers.js:235-237` | 🟢 |
| RN-17 | Detecção automática: padrão `N/M`, `N-M` ou `N DE M` na descrição (últimos 2 meses) | `electron/db-handlers.js:254-260` | 🟢 |

### Assinaturas

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-18 | Equivalente mensal: weekly × 52 / 12; yearly / 12 | `app/subscriptions/page.tsx:38-42` | 🟢 |
| RN-19 | Assinatura inativa (`active = 0`) não entra nos totais do dashboard | `app/subscriptions/page.tsx:109` | 🟢 |
| RN-20 | Alerta de vencimento: assinaturas com `next_due` em até 7 dias | `app/subscriptions/page.tsx:117-124` | 🟢 |
| RN-21 | `next_due` não é atualizado automaticamente após vencimento | 🔴 LACUNA | 🔴 |
| RN-22 | Detecção: ≥ 3 ocorrências, variação de valor < 5%, apenas `type = expense` | `electron/db-handlers.js:160-165` | 🟢 |

### Categorias

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-23 | Categorias suportam hierarquia via `parent_id` | `app/types/electron.d.ts:168` | 🟢 |
| RN-24 | Campo `type` em categoria pode ser `income` ou `expense` | 🟡 INFERIDO | 🟡 |
| RN-25 | Categorias predefinidas no front: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Salário, Investimento, Transferência, Boleto, Outros | `components/import-dropdown.tsx:161-174` | 🟢 |

### LLM / IA

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-26 | A categorização via Groq roda no processo principal (não no renderer) por segurança da API key | `electron/llm-handlers.js:41-43` | 🟢 |
| RN-27 | O parsing da resposta do LLM é frágil: busca `["` e `"]` na string | `electron/llm-handlers.js:36` | 🟢 |
| RN-28 | LLM local requer carregamento manual de arquivo de modelo pelo usuário | 🟡 INFERIDO | 🟡 |

---

## Invariantes do Sistema

1. 🟢 **Dados locais apenas** — nenhum dado financeiro é enviado para servidores externos (exceto a chamada Groq com as transações para categorização)
2. 🟢 **Banco sempre presente** — migrations rodam automaticamente ao iniciar o app
3. 🟢 **Nenhum usuário/auth** — sistema single-user, sem login
4. 🟢 **amount sempre ≥ 0** — o sinal é determinado por `type`
5. 🟡 **Formato de data canônico é ISO** (`YYYY-MM-DD`) — formato `DD/MM/YYYY` é legado

---

## Decisões de Negócio Inferidas do Git

| Decisão | Evidência | Confiança |
|---|---|---|
| PDF foi removido | `chore: remove importação de transações por PDF` (commit 89139c1) | 🟢 |
| IA foi adicionada iterativamente | `feat: adiciona categorização automática com IA` → `chore: ajusta categorização de transações por IA` (commits 4d56bc4, 96c7cff) | 🟢 |
| Suporte a OFX veio após CSV | Commit de CSV antes de OFX no histórico (373ab3b → 3b467f1) | 🟢 |
| Assinaturas foram feature adicionada | `feat: adiciona gestão de assinaturas` (6a64c56), depois detecção (5a6d4ad) e gráficos (3c3c565) | 🟢 |
| Sistema de parcelamentos foi adicionado em versões posteriores | Migrations de `installment_groups` datadas em 2026-03-27 | 🟢 |
| Migração para Knex.js foi uma refatoração explícita | `refactor: adiciona estrutura de migration do knexjs` (39b6e2a) | 🟢 |
| Bugs recorrentes de formato de data | `fix: corrige padronização no formato do campo de data` (6ec7f53) | 🟢 |
| Categorias foram adicionadas por cima de sistema existente | Múltiplas migrations de 2026-03-27 adicionando `category_id` às tabelas | 🟢 |
