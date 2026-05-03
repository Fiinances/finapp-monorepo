# Relatório de Confiança — Finapp Reverse Engineering

> Gerado pelo reversa-reviewer em 2026-05-02
> **Atualizado pós-revisão:** 2026-05-02 — todas as 8 perguntas respondidas
> Revisão cruzada via Codex: **não realizada** (plugin não disponível na sessão)
> `doc_level: detalhado` | Specs revisadas: 10 SDDs + 1 matriz

---

## 1. Contagem de Confiança por Spec (pós-revisão)

| SDD | 🟢 Alta | 🟡 Média | 🔴 Lacuna/Bug | Total | Confiança % |
|---|---|---|---|---|---|
| `ipc-db.md` | 42 | 1 | 1 | 44 | **95%** |
| `transactions.md` | 18 | 2 | 0 | 20 | **96%** |
| `import.md` | 35 | 3 | 1 | 39 | **90%** |
| `ipc-llm.md` | 23 | 1 | 1 | 25 | **92%** ↑ modelo confirmado |
| `electron-main.md` | 20 | 1 | 0 | 21 | **95%** |
| `dashboard.md` | 30 | 2 | 1 | 33 | **91%** |
| `banks.md` | 29 | 3 | 2 | 34 | **85%** ↑ balance confirmado |
| `installments.md` | 32 | 1 | 2 | 35 | **91%** |
| `subscriptions.md` | 27 | 2 | 2 | 31 | **87%** ↑ next_due confirmado |
| `categories.md` | 20 | 2 | 2 | 24 | **83%** |
| **TOTAL** | **276** | **18** | **12** | **306** | **🟢 90%** ↑ |

---

## 2. Score Global de Confiança (pós-revisão)

```
🟢 Alta confiança:   276 / 306  (90.2%)
🟡 Média confiança:   18 / 306  ( 5.9%)
🔴 Lacuna/Bug conf.:  12 / 306  ( 3.9%)

Score final: 90.2% — CONFIANÇA ALTA ✅
```

---

## 3. Inconsistências Identificadas e Reclassificadas

### 3.1 Bug de nomenclatura no Redux (`categories.md`)

**Problema:** `category.tsx` exporta `counterSlice` com `name: 'counter'` — resíduo de boilerplate. Documentado originalmente sem menção ao bug.

**Ação:** Adicionado à `gaps.md` como G-10 (cosmético). `categories.md` permanece correto — o comportamento funcional não é afetado.

### 3.2 `addCategories` chamado apenas em `banks/account/page.tsx` (`categories.md`)

**Problema:** A spec original documentou que o Redux era "carregado externamente" com 🟡. A investigação confirmou que **somente** `banks/account/page.tsx:73` chama `addCategories`. Qualquer rota de entrada diferente resultará em `catList = []`.

**Ação:** Reclassificado CB-02 de 🟡 para 🔴. Bug confirmado pelo proprietário (Q-03). Fix esperado: chamar `addCategories` em todas as páginas que exibem TxRow.

### 3.3 Modelo Groq `openai/gpt-oss-120b` (`ipc-llm.md`)

**Confirmado pelo proprietário (Q-01):** Token privado de organização — modelo funciona em produção. Reclassificado de risco desconhecido 🔴 para confirmado 🟢.

### 3.4 Parsing frágil da resposta Groq (`ipc-llm.md`)

**Confirmado:** `result.substring(result.indexOf('["'), result.lastIndexOf('"]') + 2)` — parsing por posição de string, **não por JSON.parse direto**. Isso falha se a resposta incluir texto antes de `["`.

**Status:** Já documentado como 🔴 na spec. Dívida técnica registrada — sem resolução planejada.

---

## 4. Inconsistências Cruzadas Identificadas

### 4.1 Agrupamento por `date` vs `billing_month` entre componentes de dashboard

| Componente | Campo de agrupamento | Confiança |
|---|---|---|
| `MonthlyIncomeExpenseChart` | `date` (via `buildSummaries`) | 🟢 |
| `CategoryExpenseChart` | `date` (campo direto) | 🟢 |
| `CreditCardFaturaChart` | `billing_month` (prioridade) ou `date` | 🟢 |

**Conclusão:** Comportamento **intencional por design** — um mostra quando ocorreu, outro quando foi cobrado. Documentado e aceito.

### 4.2 Batch insert atômico (`ipc-db.md`)

**Confirmado:** `INSERT` batch via `better-sqlite3` é atômico implicitamente. RNF reclassificado de 🟡 para 🟢.

---

## 5. Validação da Matriz de Rastreabilidade

| Verificação | Resultado |
|---|---|
| Todos os arquivos de código principais têm spec correspondente | ✅ Sim |
| `app/banks/account/page.tsx` sem spec dedicada | ⚠️ Documentado como gap na matriz |
| `app/banks/card/page.tsx` sem spec dedicada | ⚠️ Documentado como gap na matriz |
| `app/page.tsx` (root) sem spec | ✅ Aceitável (sem lógica de negócio) |
| `electron/runtime-config.js` sem spec | ⚠️ Médio — injeta API key em produção |
| Todas as migrations mapeadas | ✅ Sim |

---

## 6. Perguntas Geradas e Status — TODAS RESPONDIDAS ✅

| # | Pergunta | Severidade | Status | Decisão |
|---|---|---|---|---|
| Q-01 | Modelo Groq correto em uso | 🔴 Crítico | ✅ Respondido | Token privado — confirmado funcional |
| Q-02 | `balance` manual vs. calculado | 🔴 Crítico | ✅ Respondido | Informativo/manual — intencional |
| Q-03 | Redux de categorias — seeding incompleto | 🔴 Crítico | ✅ Respondido | Bug confirmado — fix pendente |
| Q-04 | `next_due` — manual ou automático | 🟡 Moderado | ✅ Respondido | Informativo — automação futura planejada |
| Q-05 | Cascata ao excluir conta | 🟡 Moderado | ✅ Respondido | Cascata completa — bug confirmado, fix pendente |
| Q-06 | Parcelamento futuro — comportamento | 🟡 Moderado | ✅ Respondido | Proibir data futura — validação ausente, fix pendente |
| Q-07 | Backup automático do SQLite | 🟡 Moderado | ✅ Respondido | Sem backup — aceito; Roadmap: Supabase |
| Q-08 | Fonte tipográfica explícita | 🟢 Cosmético | ✅ Respondido | **Poppins** definida como fonte oficial |

**Total:** 8/8 respondidas ✅ | 3 críticas · 4 moderadas · 1 cosmética

---

## 7. Bugs Confirmados pelo Proprietário (Fix Pendente)

| Bug | Spec | Impacto |
|---|---|---|
| 🔴 Cascata ao excluir conta (conta + cartões + transações + assinaturas) | `banks.md` RN-09 | Alto |
| 🔴 `first_billing_month` no futuro não bloqueado na validação | `installments.md` RN-03 | Alto |
| 🔴 `addCategories` chamado apenas em `banks/account` — Combobox vazio em outras páginas | `categories.md` CB-02 | Alto |

---

## 8. Resumo Executivo Final

O projeto Finapp está documentado com **alta confiança geral (90.2%)** em suas 10 specs SDD, 5 conjuntos de User Stories e 1 matriz de rastreabilidade bidirecional. Todas as 8 perguntas de validação foram respondidas pelo proprietário.

**Pontos fortes da documentação:**
- `ipc-db.md` e `transactions.md` com >95% de confiança
- Algoritmos críticos documentados com pseudocódigo rastreável (deduplicação, progresso de parcelamento, detecção de recorrência/padrões)
- 15 User Stories com critérios de aceitação testáveis
- Design System completo com **Poppins** definida como fonte oficial
- Roadmap técnico claro: Supabase como destino de migração

**Bugs confirmados e pendentes de implementação:**
1. Cascata completa ao excluir conta
2. Bloquear parcelamento com data futura
3. Seeding de categorias em todas as páginas com TxRow

**Próxima fase sugerida:** `/reversa-reconstructor` para planejar a reimplementação bottom-up a partir das specs geradas.

