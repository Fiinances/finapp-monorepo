# SDD — Gestão de Parcelamentos (`installments`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/installments/page.tsx`, `app/installments/components/detect-installments-sheet.tsx`
>
> 🔴 **[Revisão Q-06 — 2026-05-02]** Data de início no futuro **não é válida**. A validação deve **bloquear** `first_billing_month` no futuro. Correção C — proibir data futura na validação do formulário. **Bug atual: validação ausente.**

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `installments` |
| **Camada** | Frontend — página React |
| **Arquivos** | `app/installments/page.tsx`, `app/installments/components/detect-installments-sheet.tsx` |
| **Rota** | `/installments` |
| **Responsável por** | CRUD de grupos de parcelamento, exibição de progresso temporal e detecção automática de parcelas em transações existentes |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Página de gestão de compras parceladas no cartão de crédito. Cada grupo de parcelamento representa uma compra dividida em N mensalidades. O progresso é calculado temporalmente (quantos meses se passaram desde a 1ª parcela), não por pagamentos confirmados individualmente. Inclui detecção automática de padrões de parcelamento em transações já importadas.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Listar todos os grupos de parcelamento em tabela | **Must** | 🟢 |
| Exibir progresso visual (barra + `pago/total` + %) | **Must** | 🟢 |
| Criar novo grupo de parcelamento (Sheet inline) | **Must** | 🟢 |
| Editar grupo de parcelamento existente (Sheet reutilizado) | **Must** | 🟢 |
| Excluir grupo de parcelamento | **Must** | 🟢 |
| Exibir métricas resumidas (total em aberto, ativos, total) | **Should** | 🟢 |
| Detectar parcelamentos automáticos via `installmentGroups.detect` | **Should** | 🟢 |
| Exibir última parcela calculada via `lastBillingMonth` | **Should** | 🟢 |
| Preview do valor por parcela no formulário | **Could** | 🟢 |
| Diferenciar visualmente quitados vs. em andamento | **Could** | 🟢 |

---

## 4. Layout e Estrutura

### 4.1 Header da página

```
"Parcelamentos" (h1)
"Compras parceladas no cartão de crédito" (subtítulo)
Botões:
  [Detectar] → abre DetectInstallmentsSheet
  [Novo parcelamento] → abre Sheet de criação
```

### 4.2 Cards de métricas (3 colunas responsivas)

| Card | Valor calculado |
|---|---|
| **Total em aberto** | `SUM(remaining * perInstallment)` para todos os grupos |
| **Parcelamentos ativos** | `COUNT(groups WHERE real_remaining_installments > 0)` |
| **Total cadastrado** | `groups.length` |

**Cálculo de `totalRemaining`:** 🟢 `app/installments/page.tsx:137-141`
```
totalRemaining = SUM(
  (g.real_remaining_installments ?? 0) × (g.total_amount / g.installments)
)
```

### 4.3 Tabela de parcelamentos

| Coluna | Conteúdo | Confiança |
|---|---|---|
| Descrição | Ícone (✓ quitado / ⏰ em andamento) + descrição + badge de categoria | 🟢 |
| Cartão | Nome do cartão via lookup local | 🟢 |
| Valor total | `formatBRL(total_amount)` | 🟢 |
| Parcelas | `paid/total` (ex: `3/12`) | 🟢 |
| Progresso | Barra visual + % | 🟢 |
| 1ª parcela | `first_billing_month` (MM/YYYY) | 🟢 |
| Última parcela | `lastBillingMonth(first_billing_month, installments)` | 🟢 |
| Restante | `formatBRL(real_remaining_amount)` ou "Quitado" | 🟢 |
| Ações | Botões Editar (Pencil) e Excluir (Trash2) | 🟢 |

**Visual de quitado:** `opacity-50` na linha + ícone CheckCircle2 verde + texto "Quitado" verde

---

## 5. Formulário de CRUD (Sheet Inline)

🟢 O mesmo Sheet é reutilizado para criação e edição, controlado por `editingId`.

### 5.1 Campos do formulário

| Campo | Tipo | Obrigatório | Validação | Default |
|---|---|---|---|---|
| Cartão de crédito | `<select>` | sim | `credit_card_id !== 0` | Primeiro cartão disponível |
| Descrição | `<Input>` | sim | `trim() !== ""` | `""` |
| Valor total (R$) | `<Input type="number">` | sim | `> 0` | `0` |
| Nº de parcelas | `<Input type="number" min=2 max=60>` | sim | `>= 2` | `2` |
| 1ª parcela (MM/AAAA) | `<MonthPicker>` | sim | regex `/^(0[1-9]\|1[0-2])\/\d{4}$/` | Mês atual |
| Categoria | `<Input>` | não | — | `""` |

### 5.2 Preview de valor por parcela

🟢 Exibido abaixo dos campos quando `total_amount > 0 && installments >= 2`:
```
"12x de R$100,00 por mês"
```

### 5.3 Validações de `save()`

```
1. credit_card_id === 0 → toast.error "Preencha todos os campos obrigatórios"
2. description.trim() === "" → toast.error (mesma)
3. total_amount <= 0 → toast.error (mesma)
4. installments < 2 → toast.error (mesma)
5. first_billing_month NÃO bate com /^(0[1-9]|1[0-2])\/\d{4}$/ → toast.error "Mês da 1ª parcela deve estar no formato MM/AAAA"
```

### 5.4 Fluxo de salvamento

```
SE editingId → installmentGroups.update(editingId, form) → "Parcelamento atualizado"
SENÃO       → installmentGroups.insert(form)            → "Parcelamento cadastrado"
→ setSheetOpen(false)
→ load()  ← recarrega todos os dados
```

---

## 6. Detecção Automática (`DetectInstallmentsSheet`)

🟡 INFERIDO — arquivo não lido diretamente, inferido pela interface `detect` e props

**Aciona:** `db.installmentGroups.detect()` via IPC

**Retorna:** `DetectedInstallment[]` — parcelamentos identificados por padrão regex nas transações

**Comportamento esperado:**
```
Exibe lista de parcelamentos detectados
Usuário seleciona quais deseja cadastrar como grupo
Confirmar → db.installmentGroups.insert para cada selecionado
→ onGroupAdded() → load() na página pai
```

---

## 7. Funções Auxiliares

### `lastBillingMonth(firstBillingMonth: string, installments: number): string`

🟢 Importada de `@/lib/utils` — calcula a última fatura do parcelamento.

```
Dado: first_billing_month = "01/2025", installments = 12
Retorna: "12/2025"   (adicionando installments - 1 meses)
```

### `formatBRL(value: number): string`

🟢 Importada de `@/lib/utils` — formata valores em BRL (`R$1.234,56`)

### `addMonths(monthYear: string, n: number): string`

🟢 Importada de `@/lib/utils` — adiciona N meses a uma string `MM/YYYY`

---

## 8. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | Mínimo de 2 parcelas — UI impõe `min=2` e validação server-side | `page.tsx:95,330` | 🟢 |
| RN-02 | Máximo de 60 parcelas — apenas na UI (`max=60`), sem validação IPC | `page.tsx:331` | 🟡 |
| RN-03 | `first_billing_month` validado com regex `/^(0[1-9]\|1[0-2])\/\d{4}$/` | `page.tsx:99` | 🟢 |
| RN-04 | Progresso calculado por tempo decorrido (não por pagamentos) | `ipc-db` (real_paid_installments) | 🟢 |
| RN-05 | Grupo "ativo" = `real_remaining_installments > 0` | `page.tsx:142` | 🟢 |
| RN-06 | Grupo "quitado" = `real_remaining_installments === 0` → visual `opacity-50` | `page.tsx:214,216` | 🟢 |
| RN-07 | Exclusão remove grupo e desvincula transações (via IPC) — não deleta transações | `ipc-db:235-237` | 🟢 |
| RN-08 | `openNew()` pré-seleciona o mês atual e o primeiro cartão disponível | `page.tsx:74-76` | 🟢 |
| RN-09 | Valor por parcela = `total_amount / installments` (distribuição uniforme) | `page.tsx:213` | 🟢 |
| RN-10 | `totalRemaining` usa `real_remaining_installments ?? 0` — nunca negativo | `page.tsx:138` | 🟢 |

---

## 9. Estado do Componente

```typescript
groups: InstallmentGroup[]  // Lista de grupos com campos computados do IPC
cards: CreditCard[]         // Cartões disponíveis para seleção no form
loading: boolean            // Carregamento inicial
sheetOpen: boolean          // Controla Sheet de CRUD
form: Omit<InstallmentGroup, computed>  // Dados do formulário
saving: boolean             // Salvamento em progresso
deletingId: number | null   // ID sendo deletado (desabilita botão)
detectOpen: boolean         // Controla DetectInstallmentsSheet
editingId: number | null    // null = criação, number = edição
```

---

## 10. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Carregamento paralelo** | `Promise.all([installmentGroups.list(), creditCards.list()])` | 🟢 |
| **Otimismo parcial** | Exclusão remove do estado local imediatamente | 🟢 |
| **Sem paginação** | Carrega todos os grupos de uma vez | 🟡 |
| **Sem confirmação de exclusão** | Delete executa sem dialog de confirmação | 🔴 |
| **Progresso não real** | Baseado em calendário — pode mostrar "Quitado" mesmo com parcelas em atraso | 🔴 |

---

## 11. Critérios de Aceitação

### CA-01 — Criar parcelamento com dados válidos

```
Dado:  cartão selecionado, descrição "Notebook", total_amount = 1200,
       installments = 12, first_billing_month = "01/2025"
Quando: usuário clica em "Salvar"
Então: db.installmentGroups.insert é chamado com os dados
       toast.success "Parcelamento cadastrado"
       lista é recarregada com o novo grupo
       Sheet é fechada
```

### CA-02 — Validação: menos de 2 parcelas

```
Dado:  formulário com installments = 1
Quando: usuário clica em "Salvar"
Então: toast.error "Preencha todos os campos obrigatórios"
       nenhuma chamada IPC ocorre
```

### CA-03 — Validação: formato MM/AAAA inválido

```
Dado:  first_billing_month = "13/2025" (mês 13 inválido)
Quando: usuário clica em "Salvar"
Então: toast.error "Mês da 1ª parcela deve estar no formato MM/AAAA"
```

### CA-04 — Grupo quitado exibe visual diferenciado

```
Dado:  grupo com first_billing_month = "01/2024", installments = 6
       data atual = "09/2025" (6 meses após o término)
Quando: lista é renderizada
Então: real_remaining_installments = 0
       linha tem opacity-50
       ícone CheckCircle2 verde exibido
       coluna "Restante" exibe "Quitado"
```

### CA-05 — Preview de parcela no formulário

```
Dado:  total_amount = 1200, installments = 12
Quando: formulário está aberto com esses valores
Então: texto "12x de R$100,00 por mês" é exibido abaixo dos campos
```

### CA-06 — Excluir grupo otimisticamente

```
Dado:  grupo com id=5 na lista
Quando: usuário clica no botão de excluir (Trash2)
Então: botão é desabilitado (deletingId = 5)
       db.installmentGroups.delete(5) é chamado
       toast.success "Parcelamento removido"
       grupo é removido da lista local (sem reload)
```

### CA-07 — Editar grupo pré-preenche formulário

```
Dado:  grupo com description = "TV Samsung", installments = 6
Quando: usuário clica no botão Editar (Pencil)
Então: Sheet abre com título "Editar parcelamento"
       formulário pré-preenchido com dados do grupo
       editingId = group.id
```

---

## 12. Cenários de Borda (detalhado)

### CB-01 — Parcelamento com first_billing_month no futuro

```
Dado:  grupo com first_billing_month = "12/2026"
       data atual = "05/2026"
Quando: lista é carregada
Então: real_paid_installments pode ser negativo no IPC
       ⚠️ 🔴 LACUNA — comportamento não tratado: progresso pode exibir "0/12" ou valor incorreto
```

### CB-02 — Sem cartões cadastrados ao abrir "Novo parcelamento"

```
Dado:  nenhum cartão de crédito cadastrado
Quando: usuário clica em "Novo parcelamento"
Então: credit_card_id = 0 (padrão EMPTY)
       select exibe apenas "Selecione…" como opção
       usuário não pode selecionar cartão → validação vai falhar ao tentar salvar
```

### CB-03 — total_amount com casas decimais longas

```
Dado:  total_amount = 1000, installments = 3
Quando: preview de parcela é calculado
Então: 1000 / 3 = 333.333... → formatBRL → "R$333,33"
       ⚠️ valor exibido pode não somar exatamente R$1.000,00 (erro de arredondamento)
```

### CB-04 — `lastBillingMonth` com parcelas cruzando anos

```
Dado:  first_billing_month = "11/2025", installments = 6
Quando: lastBillingMonth é calculado
Então: 11/2025 + 5 meses = 04/2026
       exibido na coluna "Última parcela" como "04/2026"
```

---

## 13. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `window.electronAPI.db.installmentGroups.list/insert/update/delete/detect` | IPC | CRUD e detecção de parcelamentos |
| `window.electronAPI.db.creditCards.list` | IPC | Lista de cartões para seleção |
| `lib/utils` (`formatBRL`, `addMonths`, `lastBillingMonth`) | interno | Formatação e cálculo de datas |
| `components/month-picker` | interno | Seletor MM/YYYY |
| `app/installments/components/detect-installments-sheet` | interno | Sheet de detecção automática |
| `sonner` | npm | Toasts de feedback |
