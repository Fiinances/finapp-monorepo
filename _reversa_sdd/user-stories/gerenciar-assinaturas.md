# User Story — Gerenciar Assinaturas

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/subscriptions/page.tsx`, `sdd/subscriptions.md`

---

## US-09 — Cadastrar assinatura recorrente

**Como** usuário do Finapp,  
**Quero** cadastrar um serviço de assinatura recorrente (Netflix, Spotify, etc.),  
**Para que** possa acompanhar meus compromissos financeiros fixos e seu custo total.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Formulário preenchido com nome, valor e período | Assinatura cadastrada; lista atualizada |
| 2 | Assinatura com `period = "yearly"` e `amount = R$120` | Equivalente mensal exibido: "≈ R$10,00/mês" |
| 3 | Assinatura do tipo `income` | Valor exibido em verde; soma em "Receita mensal" |
| 4 | Assinatura vinculada a cartão | `credit_card_id` preenchido; nome do cartão exibido na coluna |
| 5 | `next_due` preenchido 5 dias à frente | Aparece no contador "Vencem em 7 dias" |

### Fluxo Principal

```
1. Usuário clica em "Nova assinatura"
2. SubscriptionSheet abre vazia (editing = null)
3. Usuário preenche: nome, valor, tipo, período, [next_due], [categoria], [cor], [conta/cartão]
4. Clica em "Salvar" → IPC db:subscriptions:insert
5. onSuccess() → loadAll() → lista atualizada
```

### Regras de Negócio Referenciadas

- RN-01 (`subscriptions`): métricas consideram apenas `active === 1`
- RN-02 (`subscriptions`): `type` determina cor (vermelho=despesa, verde=receita)
- RN-03 (`subscriptions`): equivalente mensal exibido apenas para não-mensais

---

## US-10 — Ativar / Desativar assinatura

**Como** usuário do Finapp,  
**Quero** pausar uma assinatura temporariamente sem excluí-la,  
**Para que** ela não some do histórico mas pare de impactar as métricas.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Usuário clica no badge "Ativa" | Toggle → `active = 0`; badge muda para "Inativa" (outline); `opacity-50` |
| 2 | Usuário clica no badge "Inativa" | Toggle → `active = 1`; badge muda para "Ativa" (filled); sem opacity |
| 3 | Toggle acontece sem reload da lista | Estado atualizado otimisticamente no Redux local |
| 4 | Assinatura inativa nas métricas | Não soma em "Despesa mensal" nem em "Ativas" |

### Regras de Negócio Referenciadas

- RN-04 (`subscriptions`): toggle é otimista — não recarrega a lista
- RN-08 (`subscriptions`): inativas ficam `opacity-50` mas visíveis

---

## US-11 — Detectar assinaturas automaticamente

**Como** usuário do Finapp,  
**Quero** que o sistema identifique padrões de cobranças recorrentes nas transações importadas,  
**Para que** possa cadastrar assinaturas rapidamente sem busca manual.

### Critérios de Aceitação

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Transação "Netflix" com ≥ 3 ocorrências e variação < 5% | Aparece como candidato na DetectSubscriptionsSheet |
| 2 | Usuário confirma assinatura detectada | `db:subscriptions:insert` é chamado com os dados |
| 3 | Transação com variação > 5% | Não aparece nos candidatos (descartada pela query SQL) |
| 4 | Transação com `type !== 'expense'` | Não aparece nos candidatos (apenas despesas) |

### Algoritmo de Detecção (referência)

```sql
SELECT description, COUNT(*) AS occurrences, AVG(amount), MIN(date), MAX(date)
FROM transactions WHERE type = 'expense'
GROUP BY description
HAVING COUNT(*) >= 3
  AND (MAX(amount) - MIN(amount)) / AVG(amount) < 0.05
ORDER BY occurrences DESC
```

### Regras de Negócio Referenciadas

- RN-03 (`ipc-db`): detecção apenas em `type = 'expense'`
- RN-04 (`ipc-db`): variação máxima 5%
- RN-05 (`ipc-db`): mínimo 3 ocorrências

---

## Referências

| Artefato | Localização |
|---|---|
| SDD completo | `_reversa_sdd/sdd/subscriptions.md` |
| Página | `app/subscriptions/page.tsx` |
| IPC de detecção | `electron/db-handlers.js:149-166` |
| Dashboard de assinaturas | `app/dashboard/components/AccountSubscriptionsCalendar.tsx` |
