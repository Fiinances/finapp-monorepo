# SDD — Categorias de Transações (`categories`)

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/features/categories/category.tsx`, `electron/db-handlers.js:75-91`
>
> 🔴 **[Revisão Q-03 — 2026-05-02]** Bug confirmado pelo proprietário: `addCategories` só é chamado em `banks/account/page.tsx`. Qualquer página com `TxRow` que não passe por `/banks/account` terá o Combobox de categorias vazio. **Correção esperada:** todas as páginas que exibem lista de transações devem chamar `addCategories` durante o carregamento.

> Gerado pelo reversa-writer em 2026-05-02 | `doc_level: detalhado`
> Rastreabilidade: `app/features/categories/category.tsx`, `electron/db-handlers.js:75-91`,
> `electron/migrations/20260327180000_create_transaction_categories.js`,
> `components/transaction-table.tsx`

---

## 1. Identificação

| Atributo | Valor |
|---|---|
| **Componente** | `categories` |
| **Camada** | Redux Slice (estado global) + IPC (CRUD) + UI inline (criação na tabela) |
| **Arquivos** | `app/features/categories/category.tsx`, `components/transaction-table.tsx`, `electron/db-handlers.js:75-91` |
| **Responsável por** | Persistência e gestão de categorias hierárquicas de transações, estado global via Redux e criação inline no componente `TxRow` |
| **Versão analisada** | 0.5.10 |

---

## 2. Propósito

🟢 As categorias classificam transações financeiras de forma estruturada. A tabela `transaction_categories` é gerenciada via IPC CRUD e seu estado é mantido no Redux Store, tornando a lista disponível globalmente sem chamadas IPC repetidas. A criação de novas categorias acontece inline na tabela de edição de transações (`TxRow`) via Combobox com opção "Criar nova categoria".

> ⚠️ 🔴 **Não existe página dedicada** (`/categories`) no sistema. A gestão é exclusivamente inline ou via IPC direto. Não há UI de listagem/edição de categorias existentes além do que é visível no Combobox.

---

## 3. Responsabilidades (MoSCoW)

| Responsabilidade | Prioridade | Confiança |
|---|---|---|
| Persistir categorias no SQLite via IPC | **Must** | 🟢 |
| Fornecer lista de categorias via Redux para componentes | **Must** | 🟢 |
| Criar nova categoria inline no `TxRow` (Combobox "Criar nova") | **Must** | 🟢 |
| Vincular `category_id` a transações na edição | **Must** | 🟢 |
| Suporte a hierarquia via `parent_id` (auto-referência) | **Should** | 🟢 |
| Suporte a `color` e `icon` por categoria | **Could** | 🟢 |
| Listar categorias ordenadas por nome (`orderBy('name')`) | **Should** | 🟢 |

---

## 4. Schema da Tabela

🟢 `electron/migrations/20260327180000_create_transaction_categories.js`

```sql
CREATE TABLE transaction_categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  color     TEXT,                                            -- hex color, nullable
  icon      TEXT,                                            -- emoji ou nome, nullable
  type      TEXT,                                            -- 'income' | 'expense' | ..., nullable
  parent_id INTEGER REFERENCES transaction_categories(id)
              ON DELETE SET NULL,                            -- hierarquia (auto-ref)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**FK Constraints ativas** (via Knex migration):
- `parent_id → transaction_categories.id ON DELETE SET NULL` — exclusão de pai desvincula filhos
- `transaction_categories.id` referenciado por:
  - `transactions.category_id ON DELETE SET NULL`
  - `subscriptions.category_id ON DELETE SET NULL` 🟡 INFERIDO
  - `installment_groups.category_id ON DELETE SET NULL` 🟡 INFERIDO

---

## 5. API IPC

| Canal | Parâmetros | Retorno | Confiança |
|---|---|---|---|
| `db:transaction_categories:list` | — | `Category[]` ordenado por `name` | 🟢 |
| `db:transaction_categories:create` | `data: Omit<Category, 'id'>` | `Category` (row completa com id gerado) | 🟢 |
| `db:transaction_categories:update` | `id: number, data: Partial<Category>` | `number` (rows affected) | 🟢 |
| `db:transaction_categories:delete` | `id: number` | `number` (rows affected) | 🟢 |

> ✅ `create` é o único handler que retorna a **row completa** — necessário para que o Combobox possa referenciar o `id` recém-gerado imediatamente.

---

## 6. Redux Slice (`category.tsx`)

🟢 `app/features/categories/category.tsx`

### 6.1 Estado

```typescript
interface CategoriesState {
  categories: Category[]
}
// initialState: { categories: [] }
```

### 6.2 Actions

| Action | Payload | Efeito |
|---|---|---|
| `addCategories(categories)` | `Category[]` | Substitui toda a lista (bulk load) |
| `addCategory(category)` | `Category` | Adiciona uma categoria ao fim da lista |

### 6.3 Uso no componente `TxRow`

```typescript
const catList = useSelector((state: RootState) => state.categories.categories)
const dispatch = useDispatch()

// Ao criar nova categoria:
const newCat = await createCategory(catInput)
dispatch(addCategory(newCat))       // adiciona ao Redux imediatamente
setLocalSelectedId(String(newCat.id))
onChange("category_id", newCat.id)  // atualiza o draft da transação
```

> 🟢 O Redux é carregado externamente — provavelmente em `loadAll()` das páginas de conta, mas **a leitura do Redux para seeding não foi confirmada em código lido**. 🟡

---

## 7. Fluxo de Criação Inline (`TxRow`)

🟢 `components/transaction-table.tsx:117-155`

```
1. Usuário digita texto no Combobox de categoria
2. SE texto não bate com nenhuma categoria existente:
   → ComboboxEmpty exibe: "Criar nova categoria: <texto>"
3. Usuário clica no botão (onMouseDown com preventDefault):
   a. createCategory(catInput) → db.transaction_categories.create({ name })
   b. dispatch(addCategory(newCat)) → adiciona ao Redux global
   c. setLocalSelectedId(String(newCat.id)) → seleciona no Combobox
   d. onChange("category_id", newCat.id) → atualiza draft da transação
   e. setCatInput(newCat.name) → exibe nome no input
```

> ⚠️ 🟡 `onMouseDown` com `e.preventDefault()` é usado para evitar que o Combobox feche antes do click ser processado — padrão específico de UI.

---

## 8. Tipo `Category`

🟢 `app/types/electron.d.ts`

```typescript
interface Category {
  id: number | string
  name: string
  color: string | null
  icon: string | null
  type: string | null       // 'income' | 'expense' | etc — não é enum fixo
  parent_id: number | null  // hierarquia (auto-referência)
}
```

> ⚠️ 🟡 `id` é tipado como `number | string` — provavelmente para compatibilidade com SQLite que pode retornar BigInt em alguns drivers.

---

## 9. Regras de Negócio

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-01 | Categorias são ordenadas por nome na listagem | `db-handlers.js:76` | 🟢 |
| RN-02 | `create` retorna a row completa (não apenas o id) | `db-handlers.js:80-82` | 🟢 |
| RN-03 | `parent_id ON DELETE SET NULL` — deletar pai não deleta filhos | `migration:16` | 🟢 |
| RN-04 | `category_id ON DELETE SET NULL` — deletar categoria não deleta transações | `migration add_category_id` | 🟢 |
| RN-05 | Criação inline disponível apenas no `TxRow` (tabela de edição) | `transaction-table.tsx:144` | 🟢 |
| RN-06 | Estado global via Redux — lista carregada uma vez e reutilizada | `category.tsx:15` | 🟢 |
| RN-07 | Não há página dedicada de gestão de categorias | Ausência de rota | 🟢 |
| RN-08 | `type` do campo category é nullable — sem enum validado | `migration:15` | 🟢 |

---

## 10. Populamento inicial (Migrations)

🟢 Duas migrations de populamento existem:

| Migration | Comportamento |
|---|---|
| `20260327190021_populate_transaction_categories.js` | Lê coluna `category` (texto) de `transactions` e insere em `transaction_categories` se não existir |
| `20260327192000_populate_and_link_transaction_categories.js` | Idem, mas também faz UPDATE em `transactions.category_id` para vincular ao id criado |

> ✅ Este é o mecanismo de migração de dados do campo `category` (texto livre legado) para `category_id` (FK estruturada). O campo `category` permanece na tabela como legado.

---

## 11. Requisitos Não Funcionais

| Atributo | Evidência | Confiança |
|---|---|---|
| **Estado global** | Redux evita chamadas IPC repetidas por componente | 🟢 |
| **Criação sem navegação** | Usuário cria categoria sem sair da tabela de edição | 🟢 |
| **Hierarquia suportada** | `parent_id` no schema, mas UI não expõe hierarquia | 🟡 |
| **Sem validação de duplicatas** | Dois registros com mesmo `name` podem existir | 🔴 |
| **Sem UI de exclusão** | Nenhuma tela de gestão (editar/deletar categorias existentes) | 🔴 |

---

## 12. Critérios de Aceitação

### CA-01 — Criar nova categoria inline

```
Dado:  usuário está editando uma transação no TxRow
       digita "Academia" no Combobox de categoria
       nenhuma categoria "Academia" existe
Quando: ComboboxEmpty exibe "Criar nova categoria: Academia"
       usuário clica nesta opção
Então: db.transaction_categories.create({ name: "Academia" }) é chamado
       nova categoria é adicionada ao Redux (dispatch addCategory)
       categoria fica selecionada no Combobox
       draft.category_id = id da nova categoria
```

### CA-02 — Selecionar categoria existente

```
Dado:  lista de categorias carregada no Redux: [{id:1, name:"Alimentação"}, ...]
       usuário digita "Ali" no Combobox
Quando: Combobox filtra opções
Então: "Alimentação" aparece na lista
       usuário seleciona → draft.category_id = 1
```

---

## 13. Implementação Mobile — Modelo Global/Por-Usuário

> **Adicionado em 2026-05-06** | Implementação: `mobile/src/screens/CategoriesScreen.tsx`, `mobile/src/hooks/useCategories.ts`, `mobile/src/types/index.ts`
> Migration aplicada: `20260507_categories_global_redesign` (Supabase)

---

### 13.1 Motivação

O modelo legado Electron criava ~50 categorias por usuário via trigger `on_auth_user_created_seed_categories` a cada novo cadastro. Isso gerou redundância massiva de dados e impossibilitava atualizações centralizadas da lista padrão.

O modelo mobile substitui isso por **categorias globais** (compartilhadas, somente leitura para usuários) + **categorias próprias** (criadas pelo usuário, CRUD completo).

---

### 13.2 Schema — Supabase PostgreSQL

```sql
CREATE TABLE transaction_categories (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                                         -- NULL = categoria global (somente leitura para usuários)
                                         -- UUID = categoria própria do usuário
  name       TEXT    NOT NULL,
  color      TEXT,                       -- hex color, nullable
  icon       TEXT,                       -- nome de ícone, nullable
  type       TEXT,                       -- 'income' | 'expense' | NULL
  parent_id  INTEGER REFERENCES transaction_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Diferença chave em relação ao legado:** `user_id` é nullable. `NULL` identifica categorias globais gerenciadas pelo sistema.

---

### 13.3 Políticas RLS (Row Level Security)

| Policy | Operação | Condição |
|---|---|---|
| `categories: read global and own` | SELECT | `user_id IS NULL OR auth.uid() = user_id` |
| `categories: insert own` | INSERT | `auth.uid() = user_id` |
| `categories: update own` | UPDATE | `auth.uid() = user_id` |
| `categories: delete own` | DELETE | `auth.uid() = user_id` |

> ✅ As políticas de escrita exigem `user_id = auth.uid()`, tornando impossível — por design — que um usuário modifique ou exclua categorias globais (`user_id IS NULL`) diretamente no banco.

---

### 13.4 Seed de Categorias Globais (51 registros)

Seeded via migration `categories_global_redesign`. Todas com `user_id = NULL`.

**Categorias pai — Despesas:**

| Nome | Cor |
|---|---|
| Alimentação | `#f97316` |
| Transporte | `#3b82f6` |
| Moradia | `#8b5cf6` |
| Saúde | `#ef4444` |
| Educação | `#06b6d4` |
| Lazer | `#ec4899` |
| Roupas | `#f59e0b` |
| Financeiro | `#6366f1` |
| Outros | `#6b7280` |

**Categorias pai — Receitas:**

| Nome | Cor |
|---|---|
| Salário | `#22c55e` |
| Investimentos | `#10b981` |
| Outras Receitas | `#84cc16` |

**Subcategorias:** Alimentação (5), Transporte (5), Moradia (6), Saúde (4), Educação (3), Lazer (4), Financeiro (3), Salário (4), Investimentos (3), Outras Receitas (2).

> Trigger e funções de seed por usuário (`handle_new_user_categories`, `seed_default_categories_for_user`) foram removidos.

---

### 13.5 Tipo `Category` — Mobile

`mobile/src/types/index.ts`

```typescript
export interface Category {
  id: number;
  user_id?: string | null;   // NULL = global (somente leitura); UUID = própria do usuário
  name: string;
  color?: string | null;
  icon?: string | null;
  type?: TransactionType | null;
  parent_id?: number | null;
  created_at?: string;
  updated_at?: string;
}
```

---

### 13.6 Hook `useCategories` — Comportamento

`mobile/src/hooks/useCategories.ts`

- `loadAll()`: `select('*').order('name')` — RLS retorna automaticamente globais + próprias do usuário autenticado
- `createCategory(data)`: insere `{ ...data, user_id: session.user.id }` — sempre cria como categoria própria
- `updateCategory(id, data)`: RLS bloqueia update em globais no servidor
- `deleteCategory(id)`: RLS bloqueia delete em globais no servidor

---

### 13.7 UI — `CategoriesScreen.tsx`

**Regras visuais e de interação:**

| Situação | Comportamento |
|---|---|
| `category.user_id == null` (global) | `TouchableOpacity.onPress = undefined`, `activeOpacity = 1` (sem feedback de toque) |
| Global — indicador | Ícone `lock` (Feather, 12px) + badge texto `"Global"` no lugar do chevron |
| `category.user_id != null` (própria) | Comportamento normal: toque abre bottom sheet de edição |
| Própria — indicador | `chevron-right` (Feather, 15px) |

**Proteção em `openSheet`:**
```typescript
const openSheet = (target: Category | null) => {
    if (target && target.user_id == null) return; // bloqueia edição de globais
    setEditTarget(target);
    // ...
};
```

---

### 13.8 Regras de Negócio — Mobile

| ID | Regra | Localização | Confiança |
|---|---|---|---|
| RN-M01 | Categorias globais (`user_id IS NULL`) são visíveis a todos os usuários | RLS SELECT policy | 🟢 |
| RN-M02 | Categorias globais não podem ser editadas nem excluídas por usuários | RLS UPDATE/DELETE policies | 🟢 |
| RN-M03 | Novas categorias criadas pelo usuário sempre recebem `user_id = auth.uid()` | `useCategories.createCategory` | 🟢 |
| RN-M04 | UI bloqueia abertura do sheet de edição para categorias globais (double protection) | `CategoriesScreen.openSheet` | 🟢 |
| RN-M05 | Categorias globais exibem badge `"Global"` com ícone de cadeado | `CategoriesScreen.CategoryRow` | 🟢 |
| RN-M06 | `loadAll` retorna globais + próprias ordenadas por nome, sem distinção explícita | `useCategories.loadAll` | 🟢 |
| RN-M07 | Hierarquia (`parent_id`) suportada no schema; UI não expõe filtro por nível | Schema + UI review | 🟡 |
| RN-M08 | Não há validação de nomes duplicados entre categorias próprias | Ausência de constraint | 🟡 |

---

### 13.9 Critérios de Aceitação — Mobile

#### CA-M01 — Visualizar categorias globais

```
Dado:  usuário autenticado acessa CategoriesScreen
Quando: loadAll() é chamado
Então: 51 categorias globais aparecem na lista
       cada uma exibe badge "Global" com ícone de cadeado
       toque nas globais não abre nenhum sheet
```

#### CA-M02 — Criar categoria própria

```
Dado:  usuário toca no botão "+"
Quando: preenche nome, cor e tipo e confirma
Então: categoria é inserida com user_id = auth.uid()
       aparece na lista misturada com as globais (ordenação por nome)
       exibe chevron-right (editável)
```

#### CA-M03 — Proteção contra edição de global (server-side)

```
Dado:  cliente tenta UPDATE/DELETE em categoria com user_id IS NULL
Quando: RLS policy "categories: update own" / "categories: delete own" é avaliada
Então: operação é rejeitada pelo Supabase (RLS violation)
       0 rows affected
```

### CA-03 — Categoria deletada desvincula transações

```
Dado:  categoria id=5 "Academia" vinculada a 3 transações via category_id
Quando: db.transaction_categories.delete(5) é chamado
Então: 3 transações ficam com category_id = NULL (ON DELETE SET NULL)
       transações não são deletadas
```

### CA-04 — `list` retorna ordenado por nome

```
Dado:  categorias: ["Transporte", "Alimentação", "Moradia"]
Quando: db.transaction_categories.list() é chamado
Então: retorna ["Alimentação", "Moradia", "Transporte"] (ordenado ASC)
```

### CA-05 — `create` retorna row completa

```
Dado:  insert de { name: "Academia" }
Quando: db.transaction_categories.create é chamado
Então: retorna { id: 42, name: "Academia", color: null, icon: null, type: null, parent_id: null, ... }
       (não apenas o id)
```

---

## 13. Cenários de Borda (detalhado)

### CB-01 — Categoria criada com nome duplicado

```
Dado:  categoria "Alimentação" já existe com id=1
Quando: usuário cria nova categoria com nome "Alimentação"
Então: nova categoria é criada com id=99 (sem validação de duplicata)
       Combobox passa a exibir duas "Alimentação" na lista
       ⚠️ 🔴 LACUNA — sem constraint UNIQUE em `name`
```

### CB-02 — Redux não carregado antes de TxRow

```
Dado:  página de conta carrega sem chamar db.transaction_categories.list()
       ou sem dispatch de addCategories
Quando: TxRow é renderizado
Então: catList = [] (Redux vazio)
       Combobox exibe lista vazia — opção "Criar nova categoria" aparece para qualquer texto
       ⚠️ categorias existentes não são exibidas para seleção
```

### CB-03 — parent_id com hierarquia no Combobox

```
Dado:  categoria "Alimentação" (parent_id=null) com filho "Restaurante" (parent_id=1)
Quando: Combobox é renderizado
Então: ambas aparecem na lista sem distinção visual de hierarquia
       ⚠️ 🔴 LACUNA — UI não renderiza hierarquia, apenas nome plano
```

### CB-04 — `id` como BigInt no SQLite

```
Dado:  melhor-sqlite3 retorna id como BigInt em alguns contextos
Quando: newCat.id é usado em String(newCat.id) e como category_id
Então: String(BigInt(42)) = "42" → ok
       onChange("category_id", BigInt(42)) → pode causar problemas de tipagem no update IPC
       ⚠️ tipo `number | string` na interface Category mitiga isso parcialmente
```

---

## 14. Dependências

| Dependência | Tipo | Uso |
|---|---|---|
| `window.electronAPI.db.transaction_categories.*` | IPC | CRUD de categorias |
| `@reduxjs/toolkit` | npm | createSlice para o store de categorias |
| `react-redux` | npm | `useSelector`, `useDispatch` no TxRow |
| `app/store.tsx` | interno | RootState e configuração do store Redux |
| `components/ui/combobox` | interno | Seletor com criação inline |

---

## 15. Implementação Mobile (React Native)

> Adicionado em 2026-05-02 — implementação completa no app mobile Expo/Supabase.

### 15.1 Hook `useCategories` (`mobile/src/hooks/useCategories.ts`)

CRUD completo sobre a tabela `transaction_categories` via Supabase direto:

| Operação | Método | Detalhe |
|---|---|---|
| Listar | `loadAll()` | `.select('*').order('name')` |
| Criar | `createCategory(data)` | INSERT com `user_id: user.id` via `supabase.auth.getUser()` |
| Atualizar | `updateCategory(id, patch)` | UPDATE `.eq('id', id)` |
| Deletar | `deleteCategory(id)` | DELETE `.eq('id', id)` |

Interface exportada:
```typescript
export interface CategoryCreate {
    name: string; color?: string | null; icon?: string | null;
    type?: string | null; parent_id?: number | null;
}
interface UseCategoriesResult {
    categories: Category[]; loading: boolean; error: string | null;
    refetch, createCategory, updateCategory, deleteCategory;
}
```

### 15.2 Tela de Gestão (`mobile/src/screens/CategoriesScreen.tsx`)

- `AppHeader` com hambúrguer (esquerda) + ícone `plus` (direita) → abre bottom sheet
- `FlatList`: dot de cor + nome + badge de tipo + chevron
- Estado vazio: ícone `tag` + mensagem
- Bottom sheet: Modal + Animated.View + PanResponder (padrão SHEET_H = SCREEN_H * 0.92)
- Formulário: nome, paleta de 8 cores, chips de tipo (receita/despesa/investimento)
- Confirmação de exclusão via `Alert.alert`

### 15.3 Criação inline em `TransactionCreateSheet`

Chip dashed "Nova" após a lista de categorias → overlay absoluto com TextInput.
Prop `onCreateCategory?: (name: string) => Promise<Category>` opcional.
`TransactionsScreen` passa `onCreateCategory={async (name) => createCategory({ name })}`.

### 15.4 Seletor de categoria em `ImportScreen` (fluxo de importação)

- `useCategories` chamado em `ImportScreen`; `categories` e `createCategory` descidos para `PreviewStep`
- Cada linha `PreviewRow` exibe chip dashed com ícone `tag` e nome da categoria (ou "Sem categoria")
- Tap no chip abre Modal de seleção: lista de categorias + opção "Sem categoria" + "Nova categoria" com TextInput inline
- `onSelectCategory(key, catId)` → `updateRow(key, { category_id: catId })`
- Criação de nova categoria diretamente no modal sem sair do fluxo de importação

### 15.5 Navegação

- Rota `Categories` adicionada a `AppTabParamList` (`navigation/types.ts`)
- `Stack.Screen name="Categories"` registrado em `AppNavigator.tsx`
- MenuItem "Categorias" (ícone `tag`) adicionado ao `SideMenu` entre "Importar Extrato" e os demais ítens

