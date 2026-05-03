# SDD — Contas Bancárias e Cartões (`banks`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/banks/page.tsx`, `app/banks/components/`
>
> ✅ **[Revisão Q-02 — 2026-05-02]** `balance` confirmado como campo **informativo/manual** — não representa saldo calculado pelas transações. Intencional por design.
> 🔴 **[Revisão Q-05 — 2026-05-02]** Exclusão de conta deve ser **cascata completa** (conta + cartões + transações + assinaturas). Comportamento atual NÃO implementa cascata — **bug confirmado pelo proprietário**.

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
Botão "Adicionar" exibido com Dropdown:
  - "Conta bancária" → abre AddBankSheet
  - "Cartão de crédito" → abre AddCreditCardSheet

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

### 5.1 `AddBankSheet` — Criar conta bancária

🟡 INFERIDO — arquivo não lido diretamente, inferido do `onSuccess: loadAll` e da API IPC

| Campo | Obrigatório | Tipo |
|---|---|---|
| Nome | sim | string |
| Banco | não | string |
| Saldo inicial | não | number |
| Cor | não | hex color picker |

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

### 5.3 `AddCreditCardSheet` — Criar cartão de crédito

🟡 INFERIDO

| Campo | Obrigatório | Tipo |
|---|---|---|
| Nome | sim | string |
| Conta vinculada | sim | FK → accounts |
| Limite de crédito | não | number |
| Dia de fechamento | não | 1–31 |
| Dia de vencimento | não | 1–31 |
| Cor | não | hex color picker |

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

---

## 7. Estado do Componente

```typescript
accounts: Account[]         // Lista de contas bancárias
creditCards: CreditCard[]   // Lista de cartões de crédito
addAccountOpen: boolean     // Controla AddBankSheet
addCardOpen: boolean        // Controla AddCreditCardSheet
editAccount: Account | null // Conta sendo editada (null = fechado)
editCard: CreditCard | null // Cartão sendo editado (null = fechado)
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
| **Sem cascata de exclusão** | 🔴 **BUG** — Excluir conta deve deletar cartões, transações e assinaturas. Não implementado. | 🔴 |

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

### CA-04 — Cartão exibe conta vinculada

```
Dado:  cartão com account_id=3
       conta id=3 nome="Itaú" banco="Banco Itaú"
Quando: página /banks é carregada
Então: card do cartão exibe "Itaú — Banco Itaú" abaixo do nome do cartão
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
