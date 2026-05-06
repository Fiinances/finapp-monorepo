# SDD — Contas Bancárias e Cartões (`banks`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/banks/page.tsx`, `app/banks/components/`
>
> ✅ **[Revisão Q-02 — 2026-05-02]** `balance` confirmado como campo **informativo/manual** — não representa saldo calculado pelas transações. Intencional por design.
> 🔴 **[Revisão Q-05 — 2026-05-02]** Exclusão de conta deve ser **cascata completa** (conta + cartões + transações + assinaturas). Comportamento atual NÃO implementa cascata — **bug confirmado pelo proprietário**.

---

> ### Implementação Mobile — Correções e Melhorias (2026-05-05)
>
> ✅ **[Fix RLS — 2026-05-05]** `useBanks.insertAccount` e `useBanks.insertCard` corrigidos para incluir `user_id` no payload via `supabase.auth.getUser()`. Sem este campo, a RLS policy `auth.uid() = user_id` das tabelas `accounts` e `credit_cards` rejeitava a inserção com erro *"new row violates row-level security policy"*. Regra aplicável a todas as tabelas com RLS por `user_id`: `transaction_categories`, `accounts`, `credit_cards`, `installment_groups`, `transactions`, `subscriptions` — qualquer `INSERT` deve incluir `user_id: user.id`.
>
> ✅ **[Fix Formatação Monetária — 2026-05-05]** Campos `balance` e `credit_limit` nos formulários de conta e cartão passaram a usar máscara BRL (`currencyMask` / `parseCurrency` em `BanksScreen.tsx`). O pré-preenchimento ao abrir edição também foi ajustado — antes exibia número cru (ex: `"1500"`).
>
> ✅ **[Melhoria UX — AddTypeSheet — 2026-05-05]** `Alert.alert` nativo substituído por **`AddTypeSheet`** — bottom sheet customizado com animação `slide`, backdrop clicável, drag handle, ícones Feather, descrições de subtítulo e total adesão ao tema dark/light da aplicação.
>
> ✅ **[Melhoria UX — Swipe e Scroll — bottom sheets — 2026-05-05]** Todos os bottom sheets (`AddTypeSheet`, `AccountFormModal`, `CardFormModal`) suportam **gesto de arrastar para baixo para fechar** (`PanResponder` + `Animated.Value`). O drag handle possui área de toque expandida (`paddingVertical: 10, paddingHorizontal: 40`). `AccountFormModal` e `CardFormModal` mantêm `ScrollView` interno para suportar formulários com muitos campos e listas longas de contas.
>
> ✅ **[Fix Schema — V3 migration — 2026-05-05]** `credit_cards.account_id` era `NOT NULL` no schema V1, causando erro *"null value in column account_id violates not-null constraint"* ao criar cartão standalone. Migration `V3__credit_cards_account_id_nullable.sql` aplicada no Supabase: (1) `ALTER COLUMN account_id DROP NOT NULL`; (2) FK alterada de `ON DELETE CASCADE` para `ON DELETE SET NULL` — ao deletar conta, cartões vinculados tornam-se standalone em vez de excluídos.

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `banks` |
| **Camada** | Frontend — páginas e componentes React |
| **Arquivos** | `app/banks/page.tsx`, `app/banks/components/add-bank-sheet.tsx`, `app/banks/components/edit-bank-sheet.tsx`, `app/banks/components/add-credit-card-sheet.tsx`, `app/banks/components/edit-credit-card-sheet.tsx` |
| **Rotas** | `/banks` (lista), `/banks/account?id=N` (detalhe conta), `/banks/card?id=N` (detalhe cartão) |
| **Responsável por** | CRUD de contas bancárias e cartões de crédito, navegação para páginas de detalhe |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 Página de gestão de contas bancárias e cartões de crédito. Exibe os ativos em grid de cards com acesso a edição/exclusão via dropdown menu. Permite criar novas contas e cartões via Sheet (painel lateral). Cada card é clicável e navega para a página de detalhe com transações e gráficos.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Listar contas bancárias em grid de cards | **Must** | 🟢 |
| Listar cartões de crédito em grid de cards | **Must** | 🟢 |
| Criar nova conta bancária (Sheet) | **Must** | 🟢 |
| Criar novo cartão de crédito (Sheet) | **Must** | 🟢 |
| Editar conta bancária existente (Sheet) | **Must** | 🟢 |
| Editar cartão de crédito existente (Sheet) | **Must** | 🟢 |
| Excluir conta bancária | **Must** | 🟢 |
| Excluir cartão de crédito | **Must** | 🟢 |
| Navegar para detalhe da conta (`/banks/account?id=N`) | **Must** | 🟢 |
| Navegar para detalhe do cartão (`/banks/card?id=N`) | **Must** | 🟢 |
| Exibir Empty State quando não há contas nem cartões | **Should** | 🟢 |
| Exibir conta vinculada ao cartão no card | **Should** | 🟢 |

---

## 4. Layout e Navegação

### 4.1 Estado vazio (`isEmpty`)

```
SE accounts.length === 0 E creditCards.length === 0:
  Exibe Empty State com:
    - Ícone Wallet2
    - Título "Nenhuma conta cadastrada"
    - Descrição "Adicione uma conta bancária ou cartão de crédito para começar."
    - Dois botões: "Cartão de crédito" e "Conta bancária"
  Botão "Adicionar" no header é OCULTADO
```

### 4.2 Estado com dados

```
Botão "+" (header) exibido → abre AddTypeSheet (bottom sheet customizado):
  - Opção "Conta bancária" (ícone briefcase) → abre AccountFormModal
  - Opção "Cartão de crédito" (ícone credit-card) → abre CardFormModal
  - Opção "Cancelar" → fecha sheet
  [Web legado usava Dropdown nativo; Mobile usa AddTypeSheet estilizado]

Seção "Contas bancárias" (Wallet2 icon):
  Grid responsivo: 1 col mobile / 2 col sm / 3 col lg
  Para cada conta:
    - Barra colorida no topo (account.color ?? #6366f1)
    - Nome da conta
    - Nome do banco (opcional)
    - Saldo exibido em BRL (account.balance ?? 0)
    - Dropdown: Editar / Excluir
    - Click → /banks/account?id={account.id}

Seção "Cartões de crédito" (CreditCard icon):
  Grid responsivo: 1 col mobile / 2 col sm / 3 col lg
  Para cada cartão:
    - Barra colorida no topo (card.color ?? #6366f1)
    - Nome do cartão com ícone colorido
    - Nome da conta vinculada (account_id → accounts lookup)
    - Limite de crédito em BRL (ou "Sem limite cadastrado")
    - Dias de fechamento e vencimento
    - Dropdown: Editar / Excluir
    - Click → /banks/card?id={card.id}
```

---

## 5. Formulários (Sheets)

### 5.1 `AddBankSheet` / `AccountFormModal` — Criar conta bancária

🟡 INFERIDO (web) / ✅ IMPLEMENTADO (mobile: `AccountFormModal` em `BanksScreen.tsx`)

| Campo | Obrigatório | Tipo | Formatação |
|---|---|---|---|
| Nome | sim | string | — |
| Banco | não | string | — |
| Saldo atual | não | number | **Máscara BRL** (`currencyMask`) — entrada e pré-preenchimento em pt-BR (ex: `1.500,00`) |
| Cor | não | hex color picker | `PRESET_COLORS` — 8 opções predefinidas |

**IPC:** `db.accounts.insert(data)` → `loadAll()`

### 5.2 `EditBankSheet` — Editar conta bancária

🟡 INFERIDO

| Campo | Pré-preenchido | Obrigatório |
|---|---|---|
| Nome | sim | sim |
| Banco | sim | não |
| Saldo | sim | não |
| Cor | sim | não |

**IPC:** `db.accounts.update(id, data)` → `loadAll()`

### 5.3 `AddCreditCardSheet` / `CardFormModal` — Criar cartão de crédito

🟡 INFERIDO (web) / ✅ IMPLEMENTADO (mobile: `CardFormModal` em `BanksScreen.tsx`)

> ✅ **[Melhoria — 2026-05-05]** `account_id` passou a ser **opcional**. Cartões de loja, mercado ou emissor não-bancário podem ser criados sem vínculo com conta. O seletor exibe a opção "Nenhuma (independente)" no topo da lista.

| Campo | Obrigatório | Tipo | Formatação |
|---|---|---|---|
| Nome | sim | string | — |
| Conta vinculada | **não** | FK → accounts \| null | Seletor com opção "Nenhuma (independente)" + dot colorido + check ativo no selecionado |
| Limite de crédito | não | number | **Máscara BRL** (`currencyMask`) — entrada e pré-preenchimento em pt-BR |
| Dia de fechamento | não | 1–31 | — |
| Dia de vencimento | não | 1–31 | — |
| Cor | não | hex color picker | `PRESET_COLORS` — 8 opções predefinidas |

**IPC:** `db.creditCards.insert(data)` → `loadAll()`

### 5.4 `EditCreditCardSheet` — Editar cartão de crédito

🟡 INFERIDO — mesmos campos do `Add` com pré-preenchimento

**IPC:** `db.creditCards.update(id, data)` → `loadAll()`

---

## 6. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | Saldo exibido é `account.balance ?? 0` — campo **informativo/manual**, não calculado pelas transações. **Intencional por design.** ✅ | `banks/page.tsx:163` | 🟢 |
| RN-02 | Cartão exibe nome da conta vinculada via lookup local (sem IPC extra) | `banks/page.tsx:180` | 🟢 |
| RN-03 | Delete de conta sem id é no-op (guard `if (!account.id) return`) | `banks/page.tsx:46` | 🟢 |
| RN-04 | Delete de cartão sem id é no-op (guard `if (!card.id) return`) | `banks/page.tsx:57` | 🟢 |
| RN-05 | Botão "Adicionar" é ocultado quando não há contas nem cartões | `banks/page.tsx:82` | 🟢 |
| RN-06 | Click no card navega para detalhe, mas click no dropdown para propagação | `e.stopPropagation()` | 🟢 |
| RN-07 | Cor padrão para conta e cartão é `#6366f1` (indigo) quando não definida | `banks/page.tsx:138,187` | 🟢 |
| RN-08 | Após qualquer operação de CRUD, `loadAll()` recarrega contas e cartões | `onSuccess={loadAll}` | 🟢 |
| RN-09 | 🔴 **BUG CONFIRMADO** — Exclusão de conta deve deletar em cascata completa: cartões vinculados, transações e assinaturas. Comportamento atual NÃO implementa cascata. | Confirmado por Q-05 | 🔴 |
| RN-10 | ✅ **CORRIGIDO (mobile)** — `insertAccount` inclui `user_id` via `supabase.auth.getUser()` para satisfazer a RLS policy `auth.uid() = user_id`; sem este campo a inserção era rejeitada. | `useBanks.ts:insertAccount` | 🟢 |
| RN-16 | ✅ **CORRIGIDO (mobile)** — `insertCard` corrigido para incluir `user_id: user.id` via `supabase.auth.getUser()`, satisfazendo a RLS policy `auth.uid() = user_id` da tabela `credit_cards`. Bug idêntico ao de `insertAccount` (RN-10). **Padrão obrigatório:** todo `INSERT` em tabela com RLS por `user_id` deve buscar `user` via `supabase.auth.getUser()` e incluir `user_id` explicitamente — tabelas afetadas: `accounts`, `credit_cards`, `installment_groups`, `transactions`, `subscriptions`, `transaction_categories`. | `useBanks.ts:insertCard` | 🟢 |
| RN-17 | ✅ **CORRIGIDO (schema)** — `credit_cards.account_id` era `NOT NULL` no schema V1, impossibilitando cartões standalone. Migration `V3__credit_cards_account_id_nullable.sql` aplicada: coluna tornou-se nullable e FK alterada de `ON DELETE CASCADE` para `ON DELETE SET NULL`. Ao deletar conta vinculada, cartão passa a ser standalone (`account_id = NULL`) em vez de excluído. | `V3__credit_cards_account_id_nullable.sql` | 🟢 |
| RN-11 | Campos `balance` e `credit_limit` são formatados com máscara BRL em tempo real (`currencyMask`); ao salvar, `parseCurrency` converte de volta para `number` antes de persistir. | `BanksScreen.tsx` | 🟢 |
| RN-12 | O seletor de tipo (Conta bancária / Cartão de crédito) usa `AddTypeSheet` — bottom sheet estilizado — em vez de `Alert.alert` nativo; respeita o tema dark/light da aplicação. | `BanksScreen.tsx:handleAddPress` | 🟢 |
| RN-13 | ✅ **[2026-05-05]** Cartão de crédito pode ser criado **sem vínculo com conta bancária** (`account_id = null`). Caso de uso: cartões de loja, mercado ou bandeira não associados a instituição bancária. O seletor mostra opção "Nenhuma (independente)" selecionada por padrão. `openAddCard` não requer contas existentes. | `BanksScreen.tsx:openAddCard / handleSaveCard` | 🟢 |
| RN-14 | ✅ **[2026-05-05]** Todos os bottom sheets suportam **gesto de arrastar para baixo para fechar** via `PanResponder` + `Animated.Value` (hook `useSwipeToDismiss`). O `panHandlers` é aplicado apenas ao drag handle (não ao sheet inteiro) para evitar conflito com `ScrollView` interno. Threshold: `dy > 80` ou velocidade `vy > 0.5`. Ao soltar sem atingir threshold, o sheet retorna à posição original com animação `Animated.spring`. | `BanksScreen.tsx:useSwipeToDismiss` | 🟢 |
| RN-15 | ✅ **[2026-05-05]** `AccountFormModal` e `CardFormModal` envolvem campos do formulário em `<ScrollView>`. O seletor de conta vinculada em `CardFormModal` está dentro do `ScrollView`, portanto suporta listas longas de contas sem truncar o conteúdo visível. `AddTypeSheet` não usa `ScrollView` (conteúdo estático: 2 opções + cancelar). | `BanksScreen.tsx:AccountFormModal / CardFormModal` | 🟢 |

---

## 7. Estado do Componente

```typescript
accounts: BankAccount[]          // Lista de contas bancárias
creditCards: CreditCard[]        // Lista de cartões de crédito
addAccountOpen: boolean          // Controla AccountFormModal (criação)
addCardOpen: boolean             // Controla CardFormModal (criação)
editAccount: BankAccount | null  // Conta sendo editada (null = fechado)
editCard: CreditCard | null      // Cartão sendo editado (null = fechado)
addTypeOpen: boolean             // Controla AddTypeSheet — seletor de tipo (mobile)
```

---

## 8. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Carregamento paralelo** | `Promise.all([accounts.list(), creditCards.list()])` | 🟢 |
| **Responsivo** | Grid com `sm:grid-cols-2 lg:grid-cols-3` | 🟢 |
| **Tolerante a falhas** | `try/catch` silencioso para ambiente sem Electron | 🟢 |
| **Saldo informativo** | `balance` é campo manual — intencional, não representa saldo real calculado ✅ | 🟢 |
| **Sem confirmação de exclusão** | Delete executa imediatamente sem dialog de confirmação | 🔴 |
| **Sem cascata de exclusão** | 🔴 **BUG** — Excluir conta deve deletar cartões, transações e assinaturas. Não implementado (web legado). ✅ **CORRIGIDO no mobile** via `useBanks.ts:deleteAccount` (cascata completa). | 🟡 |

---

## 9. Critérios de Aceitação

### CA-01 — Empty State quando sem dados

```
Dado:  nenhuma conta e nenhum cartão cadastrado
Quando: página /banks é carregada
Então: Empty State é exibido com título e dois botões de criação
       botão "Adicionar" no header NÃO é exibido
```

### CA-02 — Criação de conta bancária

```
Dado:  formulário AddBankSheet preenchido com nome e saldo
Quando: usuário submete o formulário
Então: db.accounts.insert é chamado via IPC
       toast.success é exibido
       lista é recarregada com a nova conta
       Sheet é fechada
```

### CA-03 — Exclusão de conta exibe toast de sucesso

```
Dado:  conta existente com id=5 e nome="Nubank"
Quando: usuário seleciona "Excluir" no dropdown da conta
Então: db.accounts.delete(5) é chamado
       toast.success 'Conta "Nubank" excluída' é exibido
       conta desaparece da lista
```

### CA-04 — Cartão exibe conta vinculada (quando houver)

```
Dado:  cartão com account_id=3
       conta id=3 nome="Itaú" banco="Banco Itaú"
Quando: página /banks é carregada
Então: card do cartão exibe "Itaú" abaixo do nome do cartão

Dado:  cartão com account_id=null
Quando: página /banks é carregada
Então: nenhum nome de conta é exibido abaixo do nome do cartão
```

### CA-07 — Criação de cartão sem conta vinculada

```
Dado:  formulário CardFormModal aberto
       opção "Nenhuma (independente)" selecionada no seletor de conta
       nome preenchido como "Cartão Shopee"
Quando: usuário submete o formulário
Então: credit_cards.insert é chamado com account_id = null
       cartão aparece na lista sem nome de conta vinculada
```

### CA-05 — Click no card navega para detalhe

```
Dado:  conta com id=2 exibida na lista
Quando: usuário clica no card da conta (não no dropdown)
Então: navegação para /banks/account?id=2
```

### CA-06 — Click no dropdown não propaga para card

```
Dado:  conta exibida na lista
Quando: usuário abre o dropdown de opções (MoreHorizontal)
Então: dropdown abre sem navegar para a página de detalhe
       e.stopPropagation() previne o click no card pai
```

### CA-07 — Cartão sem limite exibe texto alternativo

```
Dado:  cartão sem credit_limit preenchido
Quando: card é renderizado
Então: texto "Sem limite cadastrado" é exibido
       (não exibe R$0,00)
```

### CA-08 — Gesto de arrastar para baixo fecha o sheet

```
Dado:  qualquer bottom sheet aberto (AddTypeSheet, AccountFormModal ou CardFormModal)
Quando: usuário toca no drag handle e arrasta para baixo ≥ 80px
        OU arrasta com velocidade vy ≥ 0.5
Então: sheet fecha (onClose chamado)
       a posição translateY é resetada para 0

Dado:  usuário arrasta para baixo < 80px e solta
Quando: gesto é liberado
Então: sheet retorna à posição original com animação spring
       sheet permanece aberto
```

---

## 10. Cenários de Borda (detalhado)

### CB-01 — Conta sem saldo exibe R$0,00

```
Dado:  conta com balance = null ou balance = undefined
Quando: card é renderizado
Então: exibe "R$0,00" (via `account.balance ?? 0`)
       NÃO exibe "Sem saldo cadastrado" como cartão sem limite
```

### CB-02 — Cartão com closing_day mas sem due_day

```
Dado:  cartão com closing_day = 10 e due_day = null
Quando: card é renderizado
Então: exibe "Fecha dia 10" sem o separador "·"
       due_day não é exibido
```

### CB-03 — Exclusão de conta com erro na API

```
Dado:  db.accounts.delete lança exceção
Quando: usuário confirma exclusão
Então: toast.error exibe a mensagem do erro
       lista NÃO é recarregada (loadAll não é chamado no catch)
```

### CB-04 — Criação de cartão sem conta vinculada

```
Dado:  nenhuma conta cadastrada ao abrir AddCreditCardSheet
Quando: usuário tenta criar um cartão
Então: ⚠️ 🔴 LACUNA — comportamento não verificado;
       campo account_id é required no schema mas sem contas disponíveis,
       o seletor de contas estaria vazio
```

---

## 11. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `window.electronAPI.db.accounts.list/insert/update/delete` | IPC | CRUD de contas |
| `window.electronAPI.db.creditCards.list/insert/update/delete` | IPC | CRUD de cartões |
| `next/navigation` (`useRouter`) | Next.js | Navegação para detalhe |
| `sonner` | npm | Toasts de feedback |
| `components/ui/card` | Shadcn | Layout dos cards |
| `components/ui/dropdown-menu` | Shadcn | Menu de ações |
| `app/banks/components/add-bank-sheet` | interno | Sheet de criação de conta |
| `app/banks/components/edit-bank-sheet` | interno | Sheet de edição de conta |
| `app/banks/components/add-credit-card-sheet` | interno | Sheet de criação de cartão |
| `app/banks/components/edit-credit-card-sheet` | interno | Sheet de edição de cartão |
