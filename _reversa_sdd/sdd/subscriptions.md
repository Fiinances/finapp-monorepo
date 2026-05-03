# SDD — Gestão de Assinaturas (`subscriptions`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/subscriptions/page.tsx`, `app/subscriptions/components/`
>
> ✅ **[Revisão Q-04 — 2026-05-02]** `next_due` é campo **informativo** — atualizado manualmente pelo usuário. Renovação automática planejada para versão futura.

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `subscriptions` |
| **Camada** | Frontend — página React |
| **Arquivos** | `app/subscriptions/page.tsx`, `app/subscriptions/components/subscription-sheet.tsx`, `app/subscriptions/components/detect-subscriptions-sheet.tsx` |
| **Rota** | `/subscriptions` |
| **Responsável por** | CRUD de assinaturas recorrentes, toggle ativo/inativo, métricas de custo e detecção automática de padrões de recorrência |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Página de gestão de cobranças recorrentes (mensalidades, anuidades e semanais). Exibe todas as assinaturas em tabela com métricas de custo mensal e anual. Permite ativar/desativar assinaturas com um clique no badge de status. Inclui detecção automática de padrões de recorrência em transações existentes.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Listar todas as assinaturas em tabela | **Must** | 🟢 |
| Criar nova assinatura (SubscriptionSheet) | **Must** | 🟢 |
| Editar assinatura existente (SubscriptionSheet reutilizado) | **Must** | 🟢 |
| Excluir assinatura com confirmação nativa | **Must** | 🟢 |
| Toggle ativo/inativo por clique no badge | **Must** | 🟢 |
| Exibir métricas: ativas, despesa mensal, receita mensal, vencem em 7 dias | **Must** | 🟢 |
| Detectar assinaturas automáticas via `subscriptions.detect` | **Should** | 🟢 |
| Exibir equivalente mensal para períodos não-mensais | **Should** | 🟢 |
| Resolver e exibir nome da conta/cartão vinculado | **Should** | 🟢 |
| Diferenciar visualmente inativas (`opacity-50`) | **Could** | 🟢 |

---

## 4. Layout e Estrutura

### 4.1 Cards de métricas (4 colunas responsivas)

| Card | Cálculo | Cor |
|---|---|---|
| **Ativas** | `subscriptions.filter(s => s.active === 1).length` | Padrão |
| **Despesa mensal** | `SUM(monthlyEquivalent para s.type === 'expense' e s.active === 1)` | Vermelho |
| **Receita mensal** | `SUM(monthlyEquivalent para s.type === 'income' e s.active === 1)` | Verde |
| **Vencem em 7 dias** | `COUNT(active WHERE next_due entre hoje e hoje+7)` | Âmbar |

### 4.2 Cálculo `monthlyEquivalent`

🟢 `page.tsx:38-42` — Função local (duplicada do `AccountSubscriptionsCalendar`)

```
weekly  → amount × 52 / 12
monthly → amount (sem alteração)
yearly  → amount / 12
```

> ⚠️ 🔴 **Dívida técnica** — `monthlyEquivalent` está definida em 3 lugares distintos no projeto: `page.tsx`, `AccountSubscriptionsCalendar.tsx` e possivelmente `SubscriptionSheet`.

### 4.3 Tabela de assinaturas

| Coluna | Conteúdo | Confiança |
|---|---|---|
| Nome | Dot colorido (`sub.color`) + nome em negrito | 🟢 |
| Valor | Valor em BRL colorido (vermelho=expense, verde=income) + equivalente mensal se não-mensal | 🟢 |
| Período | `Semanal` / `Mensal` / `Anual` | 🟢 |
| Próx. vencimento | `next_due` formatado como `DD/MM/YYYY` ou `—` | 🟢 |
| Categoria | Badge secundário ou `—` | 🟢 |
| Conta / Cartão | Nome da conta ou cartão vinculado via lookup local | 🟢 |
| Status | Badge clicável: `Ativa` (filled) / `Inativa` (outline) | 🟢 |
| Ações | Dropdown: Editar / Excluir | 🟢 |

**Visual de inativa:** `opacity-50` na linha inteira quando `active === 0`

---

## 5. Comportamentos Interativos

### 5.1 Toggle ativo/inativo (`toggleActive`)

🟢 `page.tsx:83-89`

```
newActive = sub.active === 1 ? 0 : 1
db.subscriptions.update(sub.id, { active: newActive })
→ atualiza estado local otimisticamente (sem reload)
→ NÃO chama loadAll()
```

> ✅ Único lugar no app com atualização otimista completa (sem reload)

### 5.2 Exclusão com `confirm()` nativo

🟢 `page.tsx:92`

```
confirm(`Excluir "${sub.name}"?`)
  → false: cancela, nenhuma ação
  → true: db.subscriptions.delete(sub.id) → toast.success → loadAll()
```

> ℹ️ É o único módulo que usa `window.confirm()` nativo — diferente dos outros módulos que deletam sem confirmação.

### 5.3 `resolveAccountName(sub)`

🟢 `page.tsx:71-81`

```
SE sub.credit_card_id → busca em creditCards por id → retorna card.name
SE sub.account_id    → busca em accounts por id    → retorna account.name
SENÃO               → retorna "—"
```

> Prioridade: cartão > conta. Lookup é local (sem IPC extra).

---

## 6. Formulário (SubscriptionSheet)

🟡 INFERIDO — arquivo não lido, inferido da interface `Subscription` e props `subscription?: Subscription`

### 6.1 Campos esperados

| Campo | Obrigatório | Tipo |
|---|---|---|
| Nome | sim | string |
| Valor | sim | number |
| Tipo | sim | `expense` / `income` |
| Período | sim | `weekly` / `monthly` / `yearly` |
| Próximo vencimento | não | date picker (ISO) |
| Categoria | não | string |
| Cor | não | color picker (hex) |
| Conta ou cartão | não | FK → accounts / credit_cards |

**IPC para criação:** `db.subscriptions.insert(data)`
**IPC para edição:** `db.subscriptions.update(id, data)`
**Após salvar:** `onSuccess() → loadAll()`

---

## 7. Detecção Automática (`DetectSubscriptionsSheet`)

🟡 INFERIDO — arquivo não lido, inferido pelo handler IPC `subscriptions.detect`

**Aciona:** `db.subscriptions.detect()` via IPC

**Retorna:** `RecurringTransaction[]` — transações com ≥ 3 ocorrências e variação < 5%

**Comportamento esperado:**
```
Exibe lista de padrões detectados
Usuário seleciona quais deseja cadastrar como assinatura
Confirmar → db.subscriptions.insert para cada selecionado
→ onSubscriptionAdded() → loadAll() na página pai
```

---

## 8. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | Métricas de custo consideram apenas assinaturas `active === 1` | `page.tsx:109` | 🟢 |
| RN-02 | `type === 'expense'` → valor em vermelho; `'income'` → verde | `page.tsx:219` | 🟢 |
| RN-03 | Equivalente mensal exibido apenas quando `period !== 'monthly'` | `page.tsx:222` | 🟢 |
| RN-04 | Toggle de status é otimista — não recarrega a lista | `page.tsx:86-88` | 🟢 |
| RN-05 | Exclusão usa `window.confirm()` — único módulo com confirmação nativa | `page.tsx:92` | 🟢 |
| RN-06 | `next_due` não é atualizado automaticamente após vencimento | 🔴 LACUNA | 🔴 |
| RN-07 | Alerta "Vencem em 7 dias": `next_due >= hoje AND next_due <= hoje+7` | `page.tsx:120-124` | 🟢 |
| RN-08 | Assinaturas inativas (`active === 0`) ficam `opacity-50` mas permanecem na lista | `page.tsx:206` | 🟢 |
| RN-09 | Prioridade de vínculo: cartão > conta | `resolveAccountName:72-76` | 🟢 |

---

## 9. Estado do Componente

```typescript
subscriptions: Subscription[] // Todas as assinaturas (ativas + inativas)
accounts: Account[]           // Para resolução de nomes
creditCards: CreditCard[]     // Para resolução de nomes
sheetOpen: boolean            // Controla SubscriptionSheet
editing: Subscription | null  // null = criação, Subscription = edição
detectOpen: boolean           // Controla DetectSubscriptionsSheet
```

---

## 10. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Carregamento paralelo** | `Promise.all([subscriptions.list(), accounts.list(), creditCards.list()])` | 🟢 |
| **Toggle otimista** | Status atualizado no estado local sem reload completo | 🟢 |
| **Sem renovação automática** | `next_due` não é recalculado após vencimento | 🔴 |
| **Sem paginação** | Carrega todas as assinaturas de uma vez | 🟡 |
| **Confirmação de exclusão** | `window.confirm()` — comportamento diferente dos outros módulos | 🟡 |

---

## 11. Critérios de Aceitação

### CA-01 — Métricas calculadas corretamente

```
Dado:  3 assinaturas ativas:
       Netflix (expense, monthly, R$50), Spotify (expense, monthly, R$25),
       Salário (income, monthly, R$5000)
Quando: página é carregada
Então: Ativas = 3
       Despesa mensal = R$75,00
       Receita mensal = R$5.000,00
```

### CA-02 — Equivalente mensal para assinatura anual

```
Dado:  assinatura anual de R$120 (ex: iCloud)
Quando: tabela é renderizada
Então: valor exibido: "R$120,00"
       abaixo: "≈ R$10,00/mês"
```

### CA-03 — Toggle ativo → inativo

```
Dado:  assinatura ativa (active = 1)
Quando: usuário clica no badge "Ativa"
Então: db.subscriptions.update(id, { active: 0 }) é chamado
       badge muda para "Inativa" (outline)
       linha fica opacity-50
       NÃO recarrega a lista (otimista)
```

### CA-04 — Exclusão com confirmação

```
Dado:  assinatura "Netflix" na lista
Quando: usuário seleciona "Excluir" no dropdown
       e clica "OK" no confirm nativo
Então: db.subscriptions.delete(id) é chamado
       toast.success "Assinatura excluída"
       lista é recarregada
```

### CA-05 — Exclusão cancelada

```
Dado:  assinatura "Netflix" na lista
Quando: usuário seleciona "Excluir" no dropdown
       e clica "Cancelar" no confirm nativo
Então: nenhuma ação é executada
       assinatura permanece na lista
```

### CA-06 — Alerta de vencimento próximo

```
Dado:  hoje = 2025-05-02
       assinatura com next_due = "2025-05-07" (5 dias à frente)
Quando: página é carregada
Então: card "Vencem em 7 dias" exibe 1
```

### CA-07 — Assinatura sem conta/cartão vinculado

```
Dado:  assinatura sem account_id e sem credit_card_id
Quando: tabela renderiza coluna "Conta / Cartão"
Então: exibe "—"
```

---

## 12. Cenários de Borda (detalhado)

### CB-01 — `next_due` no passado não gera alerta

```
Dado:  assinatura com next_due = "2025-01-01" (já vencida)
       hoje = "2025-05-02"
Quando: `dueSoon` é calculado
Então: new Date("2025-01-01") < today → condição `d >= today` falha → não conta
       ⚠️ assinatura vencida fica invisível — não há alert separado para "vencidas"
```

### CB-02 — Assinatura semanal com equivalente mensal fracionado

```
Dado:  assinatura semanal de R$10,00
Quando: `monthlyEquivalent` é calculado
Então: 10 × 52 / 12 = 43.333...
       formatBRL → "R$43,33"
       ⚠️ pequeno erro de arredondamento acumulado em muitas assinaturas semanais
```

### CB-03 — Conta/cartão vinculado deletado sem atualizar assinatura

```
Dado:  assinatura vinculada a cartão com id=5
       cartão id=5 é deletado pelo usuário em /banks
Quando: página /subscriptions carrega após a exclusão
Então: resolveAccountName retorna "—" (lookup falha: card não encontrado)
       ⚠️ 🔴 LACUNA — assinatura fica com credit_card_id "órfão" — sem FK cascade
```

### CB-04 — Múltiplas abas do SubscriptionSheet

```
Dado:  usuário clica "Editar" em assinatura A (editing = A, sheetOpen = true)
       Sheet fecha por onOpenChange(false)
Quando: onOpenChange dispara com false
Então: setSheetOpen(false) → Sheet fecha
       editing = A ainda no estado → próxima abertura pré-preenche A
       ⚠️ Se usuário clicar "Nova assinatura" sem o Sheet ter fechado, editing deve ser null
       → openNew() seta editing = null antes de abrir
```

---

## 13. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `window.electronAPI.db.subscriptions.list/insert/update/delete/detect` | IPC | CRUD e detecção de assinaturas |
| `window.electronAPI.db.accounts.list` | IPC | Resolução de nomes de contas |
| `window.electronAPI.db.creditCards.list` | IPC | Resolução de nomes de cartões |
| `app/subscriptions/components/subscription-sheet` | interno | Sheet de CRUD |
| `app/subscriptions/components/detect-subscriptions-sheet` | interno | Sheet de detecção |
| `sonner` | npm | Toasts de feedback |
| `window.confirm` | Browser API | Confirmação de exclusão |
