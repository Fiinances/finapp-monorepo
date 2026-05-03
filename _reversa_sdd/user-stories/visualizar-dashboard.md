# User Story — Visualizar Dashboard Financeiro

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/dashboard/`, `sdd/dashboard.md`

---

## US-12 — Visualizar resumo mensal de receitas e despesas

**Como** usuário do Finapp,  
**Quero** ver um gráfico comparativo de receitas, despesas e investimentos dos últimos 12 meses,  
**Para que** possa identificar tendências e avaliar minha saúde financeira ao longo do tempo.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Dashboard é aberto com transações dos últimos 12 meses | Gráfico exibe 12 barras (uma por mês) |
| 2 | Meses sem transações | Barras zeradas exibidas (meses não são omitidos) |
| 3 | Mês com income=R$5.000, expense=R$3.000 | Linha de saldo líquido exibe R$2.000 |
| 4 | Transações do tipo `transfer` ou `card_payment` | Não aparecem nas barras; não afetam saldo líquido |
| 5 | Investimentos | Aparecem na barra laranja mas não são descontados do saldo líquido |

### Regras de Negócio Referenciadas

- RN-01 (`dashboard`): `transfer` e `card_payment` excluídos do gráfico mensal
- RN-02 (`dashboard`): `investment` não entra no `net`
- RN-08 (`dashboard`): meses zerados exibidos (inicialização prévia do grouped)

---

## US-13 — Visualizar despesas por categoria no mês

**Como** usuário do Finapp,  
**Quero** ver a distribuição das minhas despesas por categoria em um mês específico,  
**Para que** possa identificar onde estou gastando mais.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Mês selecionado com 5 categorias distintas | Gráfico donut exibe 5 fatias com legenda e % |
| 2 | Mais de 9 categorias no mês | 9 categorias exibidas + "+N outras categorias" |
| 3 | Transação sem categoria | Agrupada em "Sem categoria" |
| 4 | Usuário muda o mês/ano no seletor | Gráfico atualiza para o período selecionado |
| 5 | Nenhuma despesa no mês selecionado | Mensagem "Nenhuma despesa registrada neste mês." |

### Regras de Negócio Referenciadas

- RN-03 (`dashboard`): agrupamento usa `date`, não `billing_month`
- RN-04 (`dashboard`): transações sem categoria → "Sem categoria"
- RN-07 (`dashboard`): anos disponíveis: últimos 3

---

## US-14 — Visualizar faturas de cartão de crédito

**Como** usuário do Finapp,  
**Quero** ver a evolução das faturas de cada cartão de crédito nos últimos 6 meses,  
**Para que** possa controlar meus gastos por cartão e identificar meses de maior gasto.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Usuário tem 2 cartões com transações | Gráfico de barras agrupadas com 2 séries (uma por cartão) |
| 2 | Transação com `billing_month = "03/2025"` e `date = "02/2025"` | Aparece no mês "03/2025" (billing_month tem prioridade) |
| 3 | Nenhum cartão cadastrado | Mensagem "Nenhum cartão cadastrado." |
| 4 | Cartão sem transações nos últimos 6 meses | Barras zeradas para esse cartão (sem omissão) |

### Regras de Negócio Referenciadas

- RN-05 (`dashboard`): `CreditCardFaturaChart` usa `txBillingMonth` para agrupar
- `txBillingMonth` prioriza `billing_month` sobre `date`

---

## US-15 — Visualizar assinaturas fixas no dashboard

**Como** usuário do Finapp,  
**Quero** ver um resumo das minhas assinaturas ativas diretamente no dashboard,  
**Para que** tenha visibilidade imediata do meu custo fixo mensal sem navegar para outra página.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Usuário tem assinaturas ativas | Card "Compromissos fixos" exibido com custo mensal e anual |
| 2 | Nenhuma assinatura ativa | Card não é renderizado (componente retorna `null`) |
| 3 | Assinatura anual de R$120 | Custo mensal = R$10,00; custo anual = R$120,00 |
| 4 | Link "Gerenciar" no card | Navega para `/subscriptions` |

### Regras de Negócio Referenciadas

- RN-06 (`dashboard`): `AccountSubscriptionsCalendar` retorna `null` se sem assinaturas
- Cálculo de equivalente mensal: `weekly × 52/12`, `yearly / 12`

---

## Referências

| Artefato | Localização |
|---|---|
| SDD completo | `_reversa_sdd/sdd/dashboard.md` |
| Gráfico mensal | `app/dashboard/components/MonthlyIncomeExpenseChart.tsx` |
| Gráfico por categoria | `app/dashboard/components/CategoryExpenseChart.tsx` |
| Gráfico de faturas | `app/dashboard/components/CreditCardFaturaChart.tsx` |
| Card de assinaturas | `app/dashboard/components/AccountSubscriptionsCalendar.tsx` |
