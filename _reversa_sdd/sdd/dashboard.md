# SDD — Dashboard (`dashboard`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/dashboard/page.tsx`, `app/dashboard/components/`

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `dashboard` |
| **Camada** | Frontend — páginas e componentes React |
| **Arquivos** | `app/dashboard/page.tsx`, `app/dashboard/components/MonthlyIncomeExpenseChart.tsx`, `app/dashboard/components/CategoryExpenseChart.tsx`, `app/dashboard/components/CreditCardFaturaChart.tsx`, `app/dashboard/components/AccountSubscriptionsCalendar.tsx` |
| **Responsável por** | Visualização de métricas financeiras consolidadas via gráficos e resumos |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Página inicial do Finapp após o login. Apresenta uma visão consolidada da saúde financeira do usuário por meio de quatro componentes de visualização: comparativo mensal de receitas vs. despesas, distribuição de gastos por categoria, evolução de faturas de cartão e calendário de assinaturas fixas.

Todos os componentes são reutilizáveis: recebem `accountId` e/ou `creditCardIds` como props opcionais, permitindo reuso nas páginas de detalhe de conta/cartão.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Exibir comparativo mensal 12 meses — receitas, despesas, investimentos e saldo líquido | **Must** | 🟢 |
| Exibir distribuição de despesas por categoria no mês selecionado | **Must** | 🟢 |
| Exibir evolução de faturas por cartão nos últimos 6 meses | **Must** | 🟢 |
| Exibir assinaturas ativas com custo mensal e anual | **Should** | 🟢 |
| Suportar filtro por `accountId` em todos os componentes | **Should** | 🟢 |
| Suportar filtro por `creditCardIds` em componentes de cartão | **Should** | 🟢 |
| Permitir seleção de mês/ano no gráfico de categorias | **Should** | 🟢 |
| Ocultar calendário de assinaturas quando não houver nenhuma ativa | **Could** | 🟢 |

---

## 4. Componentes

### 4.1 `MonthlyIncomeExpenseChart`

**Localização:** `app/dashboard/components/MonthlyIncomeExpenseChart.tsx`

**Tipo de gráfico:** `ComposedChart` (Recharts) — Barras para income/expense/investment + Linha para net

**Fonte de dados:** `db.transactions.list({ accountId? })`

**Janela temporal:** últimos 12 meses (calculados a partir de `new Date()`)

**Agrupamento:**
```
PARA CADA transação no período:
  SE type === 'transfer' OU type === 'card_payment' → IGNORA
  ym = credit_card_id IS NOT NULL ? formatYearMonth(t.billing_month) : parseYearMonth(t.date)
  SE type === 'income'       → grouped[ym].income += amount
  SE type === 'investment'   → grouped[ym].investment += amount
  SENÃO (expense)            → grouped[ym].expense += amount

net[ym] = income[ym] - expense[ym]
```

**Séries do gráfico:**

| Série | Cor | Tipo |
|---|---|---|
| Receitas (`income`) | `#22c55e` | Bar |
| Despesas (`expense`) | `#ef4444` | Bar |
| Investimentos (`investment`) | `#f59e0b` | Bar |
| Saldo líquido (`net`) | `#6366f1` | Line |

**Label do eixo X:** `"Jan/25"`, `"Fev/25"`, etc. (abreviado)

**Label do eixo Y:** valores ≥ 1000 abreviados como `"1k"`, `"10k"`, etc.

**Props:**
```typescript
interface MonthlyIncomeExpenseChartProps {
  accountId?: number  // filtra transações por conta
}
```

---

### 4.2 `CategoryExpenseChart`

**Localização:** `app/dashboard/components/CategoryExpenseChart.tsx`

**Tipo de gráfico:** `PieChart` (Recharts) — Donut com legenda lateral

**Fonte de dados:** `db.transactions.list({ accountId? })` + `db.transactions.list({ creditCardId })` por cartão

**Filtro:** apenas `type === 'expense'`, no mês/ano selecionado pelo usuário

**Agrupamento:**
```
PARA CADA transação expense no mês selecionado:
  cat = t.category?.trim() || "Sem categoria"
  grouped[cat] += t.amount
```

**Ordenação:** decrescente por valor total da categoria

**Exibição:** máximo 9 categorias no ranking lateral + "+N outras categorias" se exceder

**Seleção de período:** selectores de Mês e Ano na barra do card (últimos 3 anos disponíveis)

**Paleta de cores:** 12 cores rotativas (indigo, amber, red, green, blue...)

**Props:**
```typescript
interface CategoryExpenseChartProps {
  accountId?: number
  creditCardIds?: number[]
}
```

---

### 4.3 `CreditCardFaturaChart`

**Localização:** `app/dashboard/components/CreditCardFaturaChart.tsx`

**Tipo de gráfico:** `BarChart` (Recharts) — Barras agrupadas por cartão

**Fonte de dados:** `db.creditCards.list()` + `db.transactions.list()` (todas as transações)

**Janela temporal:** últimos 6 meses de fatura (em `MM/YYYY`)

**Agrupamento:**
```
PARA CADA transação:
  SE credit_card_id == null OU type !== 'expense' → IGNORA
  bm = txBillingMonth(t)     // prioriza billing_month, fallback date
  grouped[bm][credit_card_id] += amount
```

**Séries:** uma barra por cartão de crédito, cor definida pelo `card.color` ou paleta fallback

**Props:**
```typescript
interface CreditCardFaturaChartProps {
  creditCardIds?: number[]  // filtra cartões específicos; undefined = todos
}
```

---

### 4.4 `AccountSubscriptionsCalendar`

**Localização:** `app/dashboard/components/AccountSubscriptionsCalendar.tsx`

**Tipo de exibição:** Lista de assinaturas com métricas de custo

**Fonte de dados:** `db.subscriptions.list()`

**Filtro:** apenas `active === 1` + filtro opcional por `accountId` / `creditCardIds`

**Métricas calculadas:**
```
monthlyTotal = SUM(monthlyEquivalent(s.amount, s.period) para s.type === 'expense')
yearlyTotal  = SUM(yearlyEquivalent(s.amount, s.period)  para s.type === 'expense')
```

**Normalização para equivalentes:**

| Período | Mensal | Anual |
|---|---|---|
| `weekly` | `amount × 52 / 12` | `amount × 52` |
| `monthly` | `amount` | `amount × 12` |
| `yearly` | `amount / 12` | `amount` |

**Comportamento especial:** se não há assinaturas ativas, o componente retorna `null` (não renderiza nada)

**Props:**
```typescript
interface AccountSubscriptionsCalendarProps {
  accountId?: number
  creditCardIds?: number[]
}
```

---

## 5. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | `transfer` e `card_payment` são excluídos do gráfico mensal | `MonthlyIncomeExpenseChart.tsx:70` | 🟢 |
| RN-02 | `investment` NÃO entra no cálculo do saldo líquido (`net`) | `MonthlyIncomeExpenseChart.tsx:81` | 🟢 |
| RN-03 | Agrupamento de categorias usa `date`, não `billing_month` | `CategoryExpenseChart.tsx:73` | 🟢 |
| RN-04 | Transações sem categoria são agrupadas como `"Sem categoria"` | `CategoryExpenseChart.tsx:74` | 🟢 |
| RN-05 | `CreditCardFaturaChart` usa `txBillingMonth` para agrupar por fatura | `CreditCardFaturaChart.tsx:62` | 🟢 |
| RN-06 | `AccountSubscriptionsCalendar` retorna `null` se não há assinaturas | `AccountSubscriptionsCalendar.tsx:59` | 🟢 |
| RN-07 | Anos disponíveis no seletor de CategoryExpenseChart: atual - 2, atual - 1, atual | `CategoryExpenseChart.tsx:67` | 🟢 |
| RN-08 | Barras do MonthlyIncomeExpenseChart mostram meses zerados quando sem transações | Inicialização do `grouped` com zeros | 🟢 |
| RN-09 | O Dashboard Principal inclui transações de cartão de crédito no gráfico mensal e de categorias, mas deve agrupá-las pelo `billing_month` (mês da fatura) em vez da `date`, pois as faturas podem conter gastos de meses diferentes. | Filtros Globais | 🟢 |

---

## 6. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Reutilizável** | Todos os componentes aceitam `accountId`/`creditCardIds` para uso em páginas de detalhe | 🟢 |
| **Carregamento assíncrono** | Cada componente carrega seus dados independentemente com estado `loading` | 🟢 |
| **Sem estado global** | Nenhum componente usa Redux — estado local via `useState`/`useEffect` | 🟢 |
| **Tolerante a falhas** | Blocos `try/catch` silenciosos para ambiente sem Electron | 🟢 |
| **Sem paginação** | Carrega todas as transações de uma vez — 🔴 pode impactar performance com datasets grandes | 🔴 |
| **Duplicação de parseYearMonth** | Função `parseYearMonth` redefinida em `MonthlyIncomeExpenseChart` e `CategoryExpenseChart` | 🔴 (dívida técnica) |

---

## 7. Critérios de Aceitação

### CA-01 — MonthlyIncomeExpenseChart exibe 12 meses sempre

```
Dado:  transações apenas nos últimos 3 meses
Quando: MonthlyIncomeExpenseChart é renderizado
Então: gráfico exibe 12 barras (meses)
       meses sem transações exibem barras zeradas (não são omitidos)
```

### CA-02 — CategoryExpenseChart agrupa por categoria e mês

```
Dado:  10 transações expense em março/2025 com categorias variadas
       5 transações expense em fevereiro/2025
Quando: usuário seleciona Março/2025 no seletor
Então: gráfico exibe apenas as 10 transações de março
       fevereiro não aparece
```

### CA-03 — CategoryExpenseChart limita legenda a 9 itens

```
Dado:  15 categorias distintas em um mês
Quando: CategoryExpenseChart é renderizado
Então: 9 categorias são exibidas na legenda
       texto "+6 outras categorias" aparece abaixo
```

### CA-04 — CreditCardFaturaChart agrupa por billing_month

```
Dado:  transação com billing_month = "03/2025" e date = "2025-02-28"
Quando: CreditCardFaturaChart é renderizado
Então: transação aparece no mês "03/2025" (não "02/2025")
```

### CA-05 — AccountSubscriptionsCalendar calcula custo mensal

```
Dado:  1 assinatura mensal de R$50, 1 assinatura anual de R$120
Quando: AccountSubscriptionsCalendar é renderizado
Então: custo mensal = R$50 + R$10 = R$60
       custo anual = R$600 + R$120 = R$720
```

### CA-06 — AccountSubscriptionsCalendar oculta se sem assinaturas

```
Dado:  nenhuma assinatura ativa cadastrada
Quando: AccountSubscriptionsCalendar é renderizado
Então: componente retorna null — nada é exibido na tela
```

---

## 8. Cenários de Borda (detalhado)

### CB-01 — MonthlyIncomeExpenseChart com saldo líquido negativo

```
Dado:  mês com income = R$1.000 e expense = R$3.000
Quando: gráfico é renderizado
Então: linha de net aparece abaixo do zero (-R$2.000)
       eixo Y deve suportar valores negativos (Recharts suporta automaticamente)
```

### CB-02 — CategoryExpenseChart com todas as transações sem categoria

```
Dado:  todas as transações do mês têm category = "" ou null
Quando: CategoryExpenseChart é renderizado
Então: 1 item no gráfico: "Sem categoria" com o total somado
```

### CB-03 — CreditCardFaturaChart sem cartões cadastrados

```
Dado:  nenhum cartão de crédito cadastrado
Quando: CreditCardFaturaChart é renderizado
Então: mensagem "Nenhum cartão cadastrado." exibida
       nenhum gráfico renderizado
```

### CB-04 — AccountSubscriptionsCalendar com assinatura semanal

```
Dado:  assinatura com period = "weekly" e amount = R$10
Quando: custo mensal é calculado
Então: monthlyEquivalent = 10 × 52 / 12 = R$43,33
       yearlyEquivalent = 10 × 52 = R$520
```

---

## 9. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `recharts` | npm | ComposedChart, BarChart, PieChart |
| `window.electronAPI.db.transactions.list` | IPC | Dados de transações |
| `window.electronAPI.db.creditCards.list` | IPC | Lista de cartões |
| `window.electronAPI.db.subscriptions.list` | IPC | Lista de assinaturas |
| `lib/transactions.ts` (`txBillingMonth`) | interno | Mapeamento de billing_month |
| `components/ui/chart` | Shadcn | ChartContainer, ChartTooltip |
